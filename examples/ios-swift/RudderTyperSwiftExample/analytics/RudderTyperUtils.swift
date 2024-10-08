/**
 * This client was automatically generated by RudderTyper. ** Do Not Edit **
 */

import Foundation
import Rudder

extension Array {
    func serializableArray() -> [Any] {
        var result = [Any]()
        
        for item in self {
            if let arr = item as? [Any] {
                result.append(arr.serializableArray())
            } else if let obj = item as? RudderTyperSerializable {
                result.append(obj.serializableDictionary())
            } else {
                result.append(item)
            }
        }
        return result
    }
}

class RudderTyperUtils {
    static func addContextFields(_ options: RSOption?) -> RSOption {
        let rudderOptions = options ?? RSOption() 
        let rudderTyperContext = [
                "sdk": "analytics-ios",
                "language": "swift",
                "rudderTyperVersion": "1.0.0-beta.11",
                "trackingPlanId": "trackingPlanId",
                "trackingPlanVersion": "2"
            ]
        options?.putCustomContext(rudderTyperContext, withKey: "ruddertyper")
        return rudderOptions
    }
}
