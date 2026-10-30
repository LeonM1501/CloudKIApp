/**
 * Native App-Version. Bei nativen Änderungen (neue Plugins, iOS-Code,
 * Info.plist) gemeinsam mit package.json und ios/App/App.xcodeproj erhöhen.
 * Reine Web-Änderungen brauchen keinen neuen IPA-Build.
 */
export const APP_VERSION = "2.0.1";
export const UPDATE_REPOSITORY = "LeonM1501/CloudKIApp";
export const UPDATE_RELEASE_TAG = "web-latest";
export const IPA_RELEASE_TAG = "ipa-latest";
export const IPA_ASSET_NAME = "CloudKIBridge-iPadOS.ipa";
export const WEB_ASSET_NAME = "cloudki-web.zip";
