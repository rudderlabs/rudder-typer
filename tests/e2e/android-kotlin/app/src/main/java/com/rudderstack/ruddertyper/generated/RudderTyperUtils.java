/**
 * This client was automatically generated by RudderTyper. ** Do Not Edit **
 */
package com.rudderstack.ruddertyper.generated;

import com.rudderstack.android.sdk.core.RudderOption;
import java.util.*;
import java.lang.String;
import androidx.annotation.Nullable;
import androidx.annotation.NonNull;

public final class RudderTyperUtils {
    protected static Map<String, Object> rudderTyperCtx;

    static {
        rudderTyperCtx = new HashMap<>();
        rudderTyperCtx.put("sdk", "analytics-android");
        rudderTyperCtx.put("language", "java");
        rudderTyperCtx.put("rudderTyperVersion", "1.0.0-beta.8");
        rudderTyperCtx.put("trackingPlanId", "trackingPlanId");
        rudderTyperCtx.put("trackingPlanVersion", "2");
    }

    protected static RudderOption addRudderTyperContext(final @NonNull RudderOption options){
        options.putCustomContext("ruddertyper", rudderTyperCtx);

        return options;
    }

    protected static RudderOption addRudderTyperContext(){
        RudderOption rudderTyperContext = new RudderOption();
        rudderTyperContext.putCustomContext("ruddertyper", rudderTyperCtx);

        return rudderTyperContext;
    }

    protected static List<?> serializeList(final @Nullable List<?> props){
        if (props == null) {
            return props;
        }

        List p = new ArrayList<>();
        for(Object item : props) {
            if (item instanceof List) {
                p.add(serializeList((List) item));
            } else if(item instanceof SerializableProperties) {
                p.add(((SerializableProperties) item).toRudderProperty());
            } else {
                p.add(item);
            }
        }

        return p;
    }
}
