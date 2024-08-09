//
//  AppDelegate.m
//  RudderTyperExample
//
//  Created by Satheesh Kannan on 08/08/24.
//

#import "AppDelegate.h"
#import <Rudder/Rudder.h>
#import "RudderConfig/RudderConfig.h"

@interface AppDelegate ()

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    
    [self initAnalyticsSDK];
    
    return YES;
}

- (void)initAnalyticsSDK {
    NSString *path = [[NSBundle mainBundle] pathForResource:@"RudderConfig" ofType:@"plist"];
    if (path != nil) {
        NSDictionary *plistDict = [NSDictionary dictionaryWithContentsOfFile: path];
        
        if (plistDict != nil) {
            RudderConfig *config = [[RudderConfig alloc] initWithDictionary:plistDict];
            
            RSConfigBuilder *builder = [[RSConfigBuilder alloc] init];
            
            [builder withDataPlaneUrl:config.dataPlaneUrl];
            [builder withControlPlaneUrl:config.controlPlaneUrl];
            [builder withLoglevel:RSLogLevelVerbose];
            [builder withTrackLifecycleEvens:NO];
            
            [RSClient getInstance:config.writeKey config:[builder build]];
        }
    }
}


#pragma mark - UISceneSession lifecycle


- (UISceneConfiguration *)application:(UIApplication *)application configurationForConnectingSceneSession:(UISceneSession *)connectingSceneSession options:(UISceneConnectionOptions *)options {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.
    return [[UISceneConfiguration alloc] initWithName:@"Default Configuration" sessionRole:connectingSceneSession.role];
}


- (void)application:(UIApplication *)application didDiscardSceneSessions:(NSSet<UISceneSession *> *)sceneSessions {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
}


@end
