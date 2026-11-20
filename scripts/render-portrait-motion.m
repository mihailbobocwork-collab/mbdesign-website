// Offline authoring helper, macOS 15.4+ with supported Apple Silicon.
// Prepares interpolated frames locally; the published website needs no Apple APIs.
#import <AppKit/AppKit.h>
#import <VideoToolbox/VideoToolbox.h>
#import <ImageIO/ImageIO.h>
#import <CoreImage/CoreImage.h>

static const int size = 1024;
static CVPixelBufferRef buffer(void) {
    CVPixelBufferRef value = NULL;
    NSDictionary *attributes = @{(id)kCVPixelBufferIOSurfacePropertiesKey:@{},
        (id)kCVPixelBufferCGImageCompatibilityKey:@YES,
        (id)kCVPixelBufferCGBitmapContextCompatibilityKey:@YES};
    CVPixelBufferCreate(NULL,size,size,kCVPixelFormatType_32BGRA,(__bridge CFDictionaryRef)attributes,&value);
    return value;
}
static CVPixelBufferRef load(NSString *path) {
    CGImageSourceRef source=CGImageSourceCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:path],NULL);
    CGImageRef image=CGImageSourceCreateImageAtIndex(source,0,NULL);
    CVPixelBufferRef value=buffer();CVPixelBufferLockBaseAddress(value,0);
    CGColorSpaceRef space=CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef context=CGBitmapContextCreate(CVPixelBufferGetBaseAddress(value),size,size,8,
        CVPixelBufferGetBytesPerRow(value),space,kCGImageAlphaPremultipliedFirst|kCGBitmapByteOrder32Little);
    CGContextSetInterpolationQuality(context,kCGInterpolationHigh);
    CGContextDrawImage(context,CGRectMake(0,0,size,size),image);
    CGContextRelease(context);CGColorSpaceRelease(space);CGImageRelease(image);CFRelease(source);
    CVPixelBufferUnlockBaseAddress(value,0);return value;
}
static void save(CVPixelBufferRef value,NSString *path) {
    CIImage *image=[CIImage imageWithCVPixelBuffer:value];
    CGColorSpaceRef space=CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CIContext *context=[CIContext contextWithOptions:@{kCIContextWorkingColorSpace:(__bridge id)space}];
    CGColorSpaceRelease(space);
    CGImageRef frame=[context createCGImage:image fromRect:CGRectMake(0,0,size,size)];
    CGImageDestinationRef output=CGImageDestinationCreateWithURL((__bridge CFURLRef)[NSURL fileURLWithPath:path],CFSTR("public.png"),1,NULL);
    CGImageDestinationAddImage(output,frame,NULL);CGImageDestinationFinalize(output);
    CFRelease(output);CGImageRelease(frame);
}
int main(int argc,const char *argv[]) { @autoreleasepool {
    if(argc!=4){fprintf(stderr,"Usage: render-portrait-motion listening.png writing.png output-directory\n");return 1;}
    if(!VTFrameRateConversionConfiguration.isSupported){fprintf(stderr,"Frame interpolation unavailable\n");return 2;}
    NSString *folder=@(argv[3]);[[NSFileManager defaultManager]createDirectoryAtPath:folder withIntermediateDirectories:YES attributes:nil error:nil];
    VTFrameRateConversionConfiguration *config=[[VTFrameRateConversionConfiguration alloc]initWithFrameWidth:size frameHeight:size usePrecomputedFlow:NO qualityPrioritization:VTFrameRateConversionConfigurationQualityPrioritizationQuality revision:VTFrameRateConversionConfigurationRevision1];
    VTFrameProcessor *processor=[VTFrameProcessor new];NSError *error=nil;
    if(!config||![processor startSessionWithConfiguration:config error:&error]){NSLog(@"Setup: %@; config=%@",error,config);return 3;}
    CVPixelBufferRef first=load(@(argv[1])),last=load(@(argv[2]));
    VTFrameProcessorFrame *a=[[VTFrameProcessorFrame alloc]initWithBuffer:first presentationTimeStamp:CMTimeMake(0,60)];
    VTFrameProcessorFrame *b=[[VTFrameProcessorFrame alloc]initWithBuffer:last presentationTimeStamp:CMTimeMake(60,60)];
    save(first,[folder stringByAppendingPathComponent:@"frame-000.png"]);
    save(last,[folder stringByAppendingPathComponent:@"frame-060.png"]);
    for(int i=1;i<60;i++) { @autoreleasepool {
        CVPixelBufferRef destination=buffer();
        VTFrameProcessorFrame *frame=[[VTFrameProcessorFrame alloc]initWithBuffer:destination presentationTimeStamp:CMTimeMake(i,60)];
        VTFrameRateConversionParameters *params=[[VTFrameRateConversionParameters alloc]initWithSourceFrame:a nextFrame:b opticalFlow:nil interpolationPhase:@[@((float)i/60)] submissionMode:i==1?VTFrameRateConversionParametersSubmissionModeRandom:VTFrameRateConversionParametersSubmissionModeSequentialReferencesUnchanged destinationFrames:@[frame]];
        if(![processor processWithParameters:params error:&error]){NSLog(@"Frame %d: %@",i,error);return 4;}
        save(destination,[folder stringByAppendingPathComponent:[NSString stringWithFormat:@"frame-%03d.png",i]]);
        CVPixelBufferRelease(destination);
        if(i%10==0)fprintf(stdout,"Rendered %d/60\n",i);
    }}
    [processor endSession];CVPixelBufferRelease(first);CVPixelBufferRelease(last);return 0;
}}
