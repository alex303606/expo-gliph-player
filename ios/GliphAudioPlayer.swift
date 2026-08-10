import AVFoundation
import MediaPlayer
import UIKit

// MARK: - Type aliases

public typealias EventEmitter = (String, [String: Any]?) -> Void

// MARK: - GliphAudioPlayer

/**
 * GliphAudioPlayer
 *
 * Core Swift class that manages:
 *   - AVQueuePlayer for audio playback
 *   - MPRemoteCommandCenter for lock screen / headphone controls
 *   - MPNowPlayingInfoCenter for Now Playing metadata
 *   - Audio session configuration
 *   - Queue management
 */
@objc public class GliphAudioPlayer: NSObject {

  // ── Properties ──────────────────────────────────────────────────────────────

  private var player: AVQueuePlayer?
  private var playerItems: [AVPlayerItem] = []
  private var queue: [[String: Any]] = []
  private var currentIndex: Int = -1
  private var repeatMode: Int = 0  // 0=off, 1=track, 2=queue
  private var isSetup = false
  private var progressTimer: Timer?
  private var progressInterval: TimeInterval = 1.0
  private var options: [String: Any] = [:]

  private let eventEmitter: EventEmitter
  private var timeObserver: Any?
  private var playerObservations: [NSKeyValueObservation] = []

  // ── Init ────────────────────────────────────────────────────────────────────

  @objc public init(eventEmitter: @escaping EventEmitter) {
    self.eventEmitter = eventEmitter
    super.init()
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  @objc public func setupPlayer(
    options: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !isSetup else { resolve(nil); return }

    self.options = options
    self.progressInterval = (options["progressUpdateEventInterval"] as? Double) ?? 1.0

    do {
      let session = AVAudioSession.sharedInstance()
      let category = mapIOSCategory(options["iosCategory"] as? String)
      let mode = mapIOSMode(options["iosCategoryMode"] as? String)
      let opts = mapIOSOptions(options["iosCategoryOptions"] as? [String])

      try session.setCategory(category, mode: mode, options: opts)
      try session.setActive(true)
    } catch {
      reject("setup_error", "Failed to configure audio session: \(error.localizedDescription)", error)
      return
    }

    player = AVQueuePlayer()
    player?.allowsExternalPlayback = false
    player?.automaticallyWaitsToMinimizeStalling = (options["waitForBuffer"] as? Bool) ?? true

    setupRemoteCommands()
    setupNotificationObservers()
    isSetup = true
    resolve(nil)
  }

  @objc public func destroy() {
    stopProgressTimer()
    removeObservers()
    player?.pause()
    player?.removeAllItems()
    player = nil
    queue.removeAll()
    playerItems.removeAll()
    currentIndex = -1
    isSetup = false
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    UIApplication.shared.endReceivingRemoteControlEvents()
  }

  @objc public func isReady() -> Bool { return isSetup }

  // ── Queue management ────────────────────────────────────────────────────────

  @objc public func addTracks(
    _ tracks: [[String: Any]],
    insertBeforeIndex: Int,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let insertAt = (insertBeforeIndex < 0 || insertBeforeIndex > queue.count)
      ? queue.count
      : insertBeforeIndex

    for (i, track) in tracks.enumerated() {
      queue.insert(track, at: insertAt + i)
    }

    rebuildPlayerQueue()
    resolve(insertAt)
  }

  @objc public func removeTracks(
    _ trackIds: [String],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let idSet = Set(trackIds)
    queue.removeAll { idSet.contains($0["id"] as? String ?? "") }
    rebuildPlayerQueue()
    resolve(nil)
  }

  @objc public func removeUpcomingTracks(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard currentIndex >= 0 else { resolve(nil); return }
    queue = Array(queue.prefix(currentIndex + 1))
    rebuildPlayerQueue()
    resolve(nil)
  }

  @objc public func skipToIndex(
    _ index: Int,
    initialPosition: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard index >= 0 && index < queue.count else {
      reject("skip_error", "Index out of bounds", nil); return
    }
    currentIndex = index
    rebuildPlayerQueue()
    if initialPosition >= 0 {
      player?.seek(to: CMTime(seconds: initialPosition, preferredTimescale: 1000))
    }
    player?.play()
    resolve(nil)
  }

  @objc public func skipToNext(
    initialPosition: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let next = currentIndex + 1
    guard next < queue.count else {
      reject("skip_error", "No next track", nil); return
    }
    skipToIndex(next, initialPosition: initialPosition, resolve: resolve, reject: reject)
  }

  @objc public func skipToPrevious(
    initialPosition: Double,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let prev = currentIndex - 1
    guard prev >= 0 else {
      reject("skip_error", "No previous track", nil); return
    }
    skipToIndex(prev, initialPosition: initialPosition, resolve: resolve, reject: reject)
  }

  @objc public func moveFrom(
    _ fromIndex: Int,
    toIndex: Int,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard fromIndex >= 0 && fromIndex < queue.count,
          toIndex >= 0 && toIndex < queue.count else {
      reject("move_error", "Index out of bounds", nil); return
    }
    let track = queue.remove(at: fromIndex)
    queue.insert(track, at: toIndex)
    rebuildPlayerQueue()
    resolve(nil)
  }

  // ── Playback control ────────────────────────────────────────────────────────

  @objc public func play(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.play()
    startProgressTimer()
    resolve(nil)
  }

  @objc public func pause(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.pause()
    resolve(nil)
  }

  @objc public func stop(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.pause()
    player?.seek(to: .zero)
    stopProgressTimer()
    resolve(nil)
  }

  @objc public func reset(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.pause()
    player?.removeAllItems()
    queue.removeAll()
    playerItems.removeAll()
    currentIndex = -1
    stopProgressTimer()
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    resolve(nil)
  }

  @objc public func seekTo(_ position: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.seek(to: CMTime(seconds: position, preferredTimescale: 1000)) { _ in resolve(nil) }
  }

  @objc public func seekBy(_ offset: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let player = player else { resolve(nil); return }
    let current = CMTimeGetSeconds(player.currentTime())
    let newPos = max(0, current + offset)
    player.seek(to: CMTime(seconds: newPos, preferredTimescale: 1000)) { _ in resolve(nil) }
  }

  @objc public func setVolume(_ volume: Float, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.volume = volume
    resolve(nil)
  }

  @objc public func getVolume() -> Float { return player?.volume ?? 1.0 }

  @objc public func setRate(_ rate: Float, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    player?.rate = rate
    resolve(nil)
  }

  @objc public func getRate() -> Float { return player?.rate ?? 1.0 }

  @objc public func setRepeatMode(_ mode: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    repeatMode = mode
    resolve(nil)
  }

  @objc public func getRepeatMode() -> Int { return repeatMode }

  // ── Queue getters ───────────────────────────────────────────────────────────

  @objc public func getQueue() -> [[String: Any]] { return queue }

  @objc public func getActiveTrackIndex() -> NSNumber? {
    guard currentIndex >= 0 && currentIndex < queue.count else { return nil }
    return NSNumber(value: currentIndex)
  }

  @objc public func getActiveTrack() -> [String: Any]? {
    guard currentIndex >= 0 && currentIndex < queue.count else { return nil }
    return queue[currentIndex]
  }

  @objc public func getTrackAtIndex(_ index: Int) -> [String: Any]? {
    guard index >= 0 && index < queue.count else { return nil }
    return queue[index]
  }

  @objc public func getQueueSize() -> Int { return queue.count }

  // ── State / progress ────────────────────────────────────────────────────────

  @objc public func getPlaybackState() -> [String: Any] {
    return ["state": currentStateString()]
  }

  @objc public func getProgress() -> [String: Any] {
    guard let player = player else {
      return ["position": 0.0, "duration": 0.0, "buffered": 0.0]
    }
    let position = CMTimeGetSeconds(player.currentTime())
    let duration = CMTimeGetSeconds(player.currentItem?.duration ?? .zero)
    let buffered = player.currentItem?.loadedTimeRanges.last.map {
      CMTimeGetSeconds($0.timeRangeValue.start) + CMTimeGetSeconds($0.timeRangeValue.duration)
    } ?? 0.0

    return [
      "position": position.isNaN ? 0.0 : position,
      "duration": duration.isNaN || duration.isInfinite ? 0.0 : duration,
      "buffered": buffered.isNaN ? 0.0 : buffered,
    ]
  }

  // ── Metadata ────────────────────────────────────────────────────────────────

  @objc public func updateMetadataForTrack(
    _ index: Int,
    metadata: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard index >= 0 && index < queue.count else {
      reject("metadata_error", "Index out of bounds", nil); return
    }
    var track = queue[index]
    metadata.forEach { track[$0.key] = $0.value }
    queue[index] = track
    if index == currentIndex { updateNowPlayingInfo() }
    resolve(nil)
  }

  @objc public func clearNowPlayingMetadata(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    resolve(nil)
  }

  @objc public func updateNowPlayingMetadata(
    _ metadata: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
    if let title = metadata["title"] as? String { info[MPMediaItemPropertyTitle] = title }
    if let artist = metadata["artist"] as? String { info[MPMediaItemPropertyArtist] = artist }
    if let album = metadata["album"] as? String { info[MPMediaItemPropertyAlbumTitle] = album }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    resolve(nil)
  }

  @objc public func updateOptions(
    _ opts: [String: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    options = opts
    setupRemoteCommands()
    resolve(nil)
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private func rebuildPlayerQueue() {
    guard let player = player else { return }
    player.removeAllItems()
    playerItems.removeAll()

    let startIndex = max(0, currentIndex)
    for i in startIndex..<queue.count {
      let track = queue[i]
      guard let urlString = track["url"] as? String,
            let url = URL(string: urlString) else { continue }
      let item = AVPlayerItem(url: url)
      playerItems.append(item)
      player.insert(item, after: player.items().last)
    }

    if currentIndex < 0 && !queue.isEmpty { currentIndex = 0 }
    updateNowPlayingInfo()
  }

  private func updateNowPlayingInfo() {
    guard currentIndex >= 0 && currentIndex < queue.count else { return }
    let track = queue[currentIndex]

    var info: [String: Any] = [:]
    info[MPMediaItemPropertyTitle] = track["title"] as? String ?? ""
    info[MPMediaItemPropertyArtist] = track["artist"] as? String ?? ""
    info[MPMediaItemPropertyAlbumTitle] = track["album"] as? String ?? ""

    if let duration = track["duration"] as? Double, duration > 0 {
      info[MPMediaItemPropertyPlaybackDuration] = duration
    } else if let item = player?.currentItem {
      let d = CMTimeGetSeconds(item.duration)
      if !d.isNaN && !d.isInfinite { info[MPMediaItemPropertyPlaybackDuration] = d }
    }

    info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = CMTimeGetSeconds(player?.currentTime() ?? .zero)
    info[MPNowPlayingInfoPropertyPlaybackRate] = player?.rate ?? 0.0

    // Artwork
    if let artworkURL = track["artwork"] as? String, !artworkURL.isEmpty {
      loadArtwork(from: artworkURL) { image in
        if let image = image {
          info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
      }
    } else {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
  }

  private func loadArtwork(from urlString: String, completion: @escaping (UIImage?) -> Void) {
    guard let url = URL(string: urlString) else { completion(nil); return }
    URLSession.shared.dataTask(with: url) { data, _, _ in
      DispatchQueue.main.async {
        completion(data.flatMap { UIImage(data: $0) })
      }
    }.resume()
  }

  private func currentStateString() -> String {
    guard let player = player else { return "none" }
    switch player.timeControlStatus {
    case .playing: return "playing"
    case .paused:
      return player.currentItem == nil ? "none" : "paused"
    case .waitingToPlayAtSpecifiedRate:
      return "buffering"
    @unknown default:
      return "none"
    }
  }

  // ── Remote commands ─────────────────────────────────────────────────────────

  private func setupRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    UIApplication.shared.beginReceivingRemoteControlEvents()

    let capabilities = options["capabilities"] as? [String] ?? [
      "play", "pause", "stop", "skip-to-next", "skip-to-previous", "seek-to"
    ]

    center.playCommand.isEnabled = capabilities.contains("play")
    center.playCommand.removeTarget(nil)
    center.playCommand.addTarget { [weak self] _ in
      self?.player?.play()
      self?.eventEmitter("remote-play", nil)
      return .success
    }

    center.pauseCommand.isEnabled = capabilities.contains("pause")
    center.pauseCommand.removeTarget(nil)
    center.pauseCommand.addTarget { [weak self] _ in
      self?.player?.pause()
      self?.eventEmitter("remote-pause", nil)
      return .success
    }

    center.stopCommand.isEnabled = capabilities.contains("stop")
    center.stopCommand.removeTarget(nil)
    center.stopCommand.addTarget { [weak self] _ in
      self?.player?.pause()
      self?.eventEmitter("remote-stop", nil)
      return .success
    }

    center.nextTrackCommand.isEnabled = capabilities.contains("skip-to-next")
    center.nextTrackCommand.removeTarget(nil)
    center.nextTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      let next = self.currentIndex + 1
      if next < self.queue.count {
        self.skipToIndex(next, initialPosition: -1, resolve: { _ in }, reject: { _, _, _ in })
      }
      self.eventEmitter("remote-next", nil)
      return .success
    }

    center.previousTrackCommand.isEnabled = capabilities.contains("skip-to-previous")
    center.previousTrackCommand.removeTarget(nil)
    center.previousTrackCommand.addTarget { [weak self] _ in
      guard let self = self else { return .commandFailed }
      let prev = self.currentIndex - 1
      if prev >= 0 {
        self.skipToIndex(prev, initialPosition: -1, resolve: { _ in }, reject: { _, _, _ in })
      }
      self.eventEmitter("remote-previous", nil)
      return .success
    }

    center.changePlaybackPositionCommand.isEnabled = capabilities.contains("seek-to")
    center.changePlaybackPositionCommand.removeTarget(nil)
    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      guard let e = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
      self?.player?.seek(to: CMTime(seconds: e.positionTime, preferredTimescale: 1000))
      self?.eventEmitter("remote-seek", ["position": e.positionTime])
      return .success
    }

    let fwdInterval = options["forwardJumpInterval"] as? Double ?? 15.0
    let bwdInterval = options["backwardJumpInterval"] as? Double ?? 15.0

    center.skipForwardCommand.isEnabled = capabilities.contains("jump-forward")
    center.skipForwardCommand.preferredIntervals = [NSNumber(value: fwdInterval)]
    center.skipForwardCommand.removeTarget(nil)
    center.skipForwardCommand.addTarget { [weak self] event in
      guard let e = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
      self?.seekBy(e.interval, resolve: { _ in }, reject: { _, _, _ in })
      self?.eventEmitter("remote-jump-forward", ["interval": e.interval])
      return .success
    }

    center.skipBackwardCommand.isEnabled = capabilities.contains("jump-backward")
    center.skipBackwardCommand.preferredIntervals = [NSNumber(value: bwdInterval)]
    center.skipBackwardCommand.removeTarget(nil)
    center.skipBackwardCommand.addTarget { [weak self] event in
      guard let e = event as? MPSkipIntervalCommandEvent else { return .commandFailed }
      self?.seekBy(-e.interval, resolve: { _ in }, reject: { _, _, _ in })
      self?.eventEmitter("remote-jump-backward", ["interval": e.interval])
      return .success
    }
  }

  // ── Observers ───────────────────────────────────────────────────────────────

  private func setupNotificationObservers() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(playerItemDidFinish(_:)),
      name: .AVPlayerItemDidPlayToEndTime,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(playerItemFailed(_:)),
      name: .AVPlayerItemFailedToPlayToEndTime,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(audioSessionInterrupted(_:)),
      name: AVAudioSession.interruptionNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(audioRouteChanged(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: nil
    )

    // Observe player status
    if let player = player {
      let obs = player.observe(\.timeControlStatus, options: [.new]) { [weak self] p, _ in
        self?.eventEmitter("playback-state", ["state": self?.currentStateString() ?? "none"])
        self?.updateNowPlayingInfo()
      }
      playerObservations.append(obs)
    }
  }

  private func removeObservers() {
    NotificationCenter.default.removeObserver(self)
    playerObservations.forEach { $0.invalidate() }
    playerObservations.removeAll()
    if let obs = timeObserver {
      player?.removeTimeObserver(obs)
      timeObserver = nil
    }
  }

  @objc private func playerItemDidFinish(_ notification: Notification) {
    // Only react to notifications for our own player's current item —
    // `object: nil` on the observer means this fires for *any* AVPlayerItem
    // in the whole app (e.g. a video player elsewhere), so we must filter here.
    guard let finishedItem = notification.object as? AVPlayerItem,
          finishedItem === player?.currentItem else { return }

    let nextIndex = currentIndex + 1

    if repeatMode == 1 {
      // Repeat current track
      player?.seek(to: .zero)
      player?.play()
      return
    }

    if nextIndex < queue.count {
      currentIndex = nextIndex
      updateNowPlayingInfo()
      eventEmitter("playback-active-track-changed", [
        "index": nextIndex,
        "track": queue[nextIndex],
        "lastIndex": currentIndex - 1,
        "lastPosition": 0.0,
      ])
    } else if repeatMode == 2 {
      // Repeat queue
      currentIndex = 0
      rebuildPlayerQueue()
      player?.play()
    } else {
      eventEmitter("playback-queue-ended", [
        "index": currentIndex,
        "position": CMTimeGetSeconds(player?.currentTime() ?? .zero),
      ])
    }
  }

  @objc private func playerItemFailed(_ notification: Notification) {
    guard let failedItem = notification.object as? AVPlayerItem,
          failedItem === player?.currentItem else { return }

    let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
    eventEmitter("playback-error", [
      "code": "playback_error",
      "message": error?.localizedDescription ?? "Unknown error",
    ])
    eventEmitter("playback-state", ["state": "error"])
  }

  @objc private func audioSessionInterrupted(_ notification: Notification) {
    guard let typeValue = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

    if type == .began {
      player?.pause()
      eventEmitter("remote-duck", ["paused": true, "permanent": false, "focusLoss": true])
    } else if type == .ended {
      let shouldResume = (notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt)
        .flatMap { AVAudioSession.InterruptionOptions(rawValue: $0) }
        .map { $0.contains(.shouldResume) } ?? false
      if shouldResume { player?.play() }
      eventEmitter("remote-duck", ["paused": false, "permanent": false, "focusLoss": false])
    }
  }

  @objc private func audioRouteChanged(_ notification: Notification) {
    guard let reasonValue = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
          let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
    // Pause on headphone unplug (standard iOS behavior)
    if reason == .oldDeviceUnavailable { player?.pause() }
  }

  // ── Progress timer ──────────────────────────────────────────────────────────

  private func startProgressTimer() {
    stopProgressTimer()
    progressTimer = Timer.scheduledTimer(withTimeInterval: progressInterval, repeats: true) { [weak self] _ in
      guard let self = self, let player = self.player, player.timeControlStatus == .playing else { return }
      let progress = self.getProgress()
      var payload = progress
      payload["track"] = self.currentIndex
      self.eventEmitter("playback-progress-updated", payload)
      self.updateNowPlayingInfo()
    }
  }

  private func stopProgressTimer() {
    progressTimer?.invalidate()
    progressTimer = nil
  }

  // ── Audio session mapping ───────────────────────────────────────────────────

  private func mapIOSCategory(_ string: String?) -> AVAudioSession.Category {
    switch string {
    case "playAndRecord": return .playAndRecord
    case "multiRoute": return .multiRoute
    case "ambient": return .ambient
    case "soloAmbient": return .soloAmbient
    case "record": return .record
    default: return .playback
    }
  }

  private func mapIOSMode(_ string: String?) -> AVAudioSession.Mode {
    switch string {
    case "moviePlayback": return .moviePlayback
    case "spokenAudio": return .spokenAudio
    case "videoChat": return .videoChat
    case "voiceChat": return .voiceChat
    case "voicePrompt": return .voicePrompt
    default: return .default
    }
  }

  private func mapIOSOptions(_ strings: [String]?) -> AVAudioSession.CategoryOptions {
    var opts: AVAudioSession.CategoryOptions = []
    strings?.forEach { s in
      switch s {
      case "mixWithOthers": opts.insert(.mixWithOthers)
      case "duckOthers": opts.insert(.duckOthers)
      case "allowBluetooth": opts.insert(.allowBluetooth)
      case "allowBluetoothA2DP": opts.insert(.allowBluetoothA2DP)
      case "allowAirPlay": opts.insert(.allowAirPlay)
      case "defaultToSpeaker": opts.insert(.defaultToSpeaker)
      default: break
      }
    }
    return opts
  }
}
