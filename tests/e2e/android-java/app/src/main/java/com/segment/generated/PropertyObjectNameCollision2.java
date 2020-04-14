/**
* This client was automatically generated by Segment Typewriter. ** Do Not Edit **
*/
package com.segment.generated;

import java.util.*;
import com.segment.analytics.Properties;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public final class PropertyObjectNameCollision2 extends SerializableProperties {
  private Properties properties;

  private PropertyObjectNameCollision2(Properties properties) {
    this.properties = properties;
	}

  protected Properties toProperties() {
    return properties;
	}

  /**
  * Builder for {@link PropertyObjectNameCollision2}
  */
  public static class Builder {
    private Properties properties;

    /**
    * Builder for {@link PropertyObjectNameCollision2}
    */
    public Builder() {
      properties = new Properties();
    }


    /**
     * This property is optional and not required to generate a valid PropertyObjectNameCollision2 object
     */
    public Builder universe(final @Nullable Universe1 universe) {
      if(universe != null){
        properties.putValue("universe", universe.toProperties());
      }else{
        properties.putValue("universe", universe);
      }
      return this;
    } 
    

    /**
    * Build an instance of {@link PropertyObjectNameCollision2}
    */
    public PropertyObjectNameCollision2 build() {
      return new PropertyObjectNameCollision2(properties);
    }
  }
}