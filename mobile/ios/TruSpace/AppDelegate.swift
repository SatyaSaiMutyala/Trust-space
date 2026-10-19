import UIKit
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  // The UI lives in SceneDelegate, so this stays nil. It must exist though: React Native Firebase Messaging reads
  // `UIApplication.shared.delegate.window` from Objective-C at launch and a missing property crashes the app
  // (doesNotRecognizeSelector in RNFBMessaging+NSNotificationCenter).
  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure() // push notifications (GoogleService-Info.plist)
    return true
  }
}
