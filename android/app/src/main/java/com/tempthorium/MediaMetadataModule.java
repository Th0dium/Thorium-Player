package com.tempthorium;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

public class MediaMetadataModule extends ReactContextBaseJavaModule {
    
    public MediaMetadataModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "MediaMetadata";
    }

    @ReactMethod
    public void getMetadata(String filePath, Promise promise) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        
        try {
            retriever.setDataSource(filePath);
            
            WritableMap metadata = new WritableNativeMap();
            
            // Extract basic metadata
            String title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
            String artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
            String album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM);
            String genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE);
            String durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR);
            
            metadata.putString("title", title != null ? title : "");
            metadata.putString("artist", artist != null ? artist : "");
            metadata.putString("album", album != null ? album : "");
            metadata.putString("genre", genre != null ? genre : "");
            metadata.putString("year", year != null ? year : "");
            
            // Parse duration (in milliseconds)
            if (durationStr != null) {
                try {
                    long duration = Long.parseLong(durationStr);
                    metadata.putDouble("duration", duration);
                } catch (NumberFormatException e) {
                    metadata.putDouble("duration", 0);
                }
            } else {
                metadata.putDouble("duration", 0);
            }
            
            // Extract album art
            byte[] artBytes = retriever.getEmbeddedPicture();
            if (artBytes != null) {
                // Save to cache directory and return file path
                // Android will handle thumbnail generation automatically
                try {
                    String cacheDir = getReactApplicationContext().getCacheDir().getAbsolutePath();
                    String artworkDir = cacheDir + "/artwork";
                    java.io.File dir = new java.io.File(artworkDir);
                    if (!dir.exists()) {
                        dir.mkdirs();
                    }
                    
                    // Use MD5 hash of file path as filename to avoid duplicates
                    String hash = String.valueOf(filePath.hashCode());
                    String artworkPath = artworkDir + "/" + hash + ".jpg";
                    java.io.File artworkFile = new java.io.File(artworkPath);
                    
                    // Only write if file doesn't exist (cache)
                    if (!artworkFile.exists()) {
                        Bitmap bitmap = BitmapFactory.decodeByteArray(artBytes, 0, artBytes.length);
                        if (bitmap != null) {
                            java.io.FileOutputStream fos = new java.io.FileOutputStream(artworkFile);
                            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, fos);
                            fos.close();
                            bitmap.recycle();
                        }
                    }
                    
                    metadata.putString("artwork", "file://" + artworkPath);
                } catch (Exception e) {
                    metadata.putString("artwork", "");
                }
            } else {
                metadata.putString("artwork", "");
            }
            
            promise.resolve(metadata);
            
        } catch (Exception e) {
            promise.reject("METADATA_ERROR", "Failed to extract metadata: " + e.getMessage());
        } finally {
            try {
                retriever.release();
            } catch (Exception e) {
                // Ignore release errors
            }
        }
    }
}
