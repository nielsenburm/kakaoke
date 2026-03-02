package com.kakaoke.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.*;
import java.util.List;

public class S3StorageProvider implements StorageProvider {

    private static final Logger log = LoggerFactory.getLogger(S3StorageProvider.class);

    private final S3Client s3;
    private final String bucket;
    private final String prefix; // e.g. "songs/" — always ends with /

    public S3StorageProvider(S3Client s3, String bucket, String prefix) {
        this.s3 = s3;
        this.bucket = bucket;
        this.prefix = prefix.endsWith("/") ? prefix : prefix + "/";
        log.info("S3 storage: bucket={}, prefix={}", bucket, this.prefix);
    }

    @Override
    public List<String> listSongDirectories() throws IOException {
        try {
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(prefix)
                    .delimiter("/")
                    .build();

            ListObjectsV2Response response = s3.listObjectsV2(request);
            return response.commonPrefixes().stream()
                    .map(CommonPrefix::prefix)
                    .map(p -> p.substring(prefix.length()))
                    .map(p -> p.endsWith("/") ? p.substring(0, p.length() - 1) : p)
                    .filter(p -> !p.isEmpty())
                    .sorted()
                    .toList();
        } catch (S3Exception e) {
            throw new IOException("Failed to list S3 song directories", e);
        }
    }

    @Override
    public List<String> listFiles(String songDir) throws IOException {
        try {
            String dirPrefix = prefix + songDir + "/";
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(dirPrefix)
                    .delimiter("/")
                    .build();

            ListObjectsV2Response response = s3.listObjectsV2(request);
            return response.contents().stream()
                    .map(S3Object::key)
                    .map(k -> k.substring(dirPrefix.length()))
                    .filter(k -> !k.isEmpty())
                    .sorted()
                    .toList();
        } catch (S3Exception e) {
            throw new IOException("Failed to list S3 files for " + songDir, e);
        }
    }

    @Override
    public InputStream openFile(String songDir, String fileName) throws IOException {
        try {
            String key = prefix + songDir + "/" + fileName;
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            return s3.getObject(request);
        } catch (NoSuchKeyException e) {
            throw new FileNotFoundException("S3 object not found: " + songDir + "/" + fileName);
        } catch (S3Exception e) {
            throw new IOException("Failed to get S3 object: " + songDir + "/" + fileName, e);
        }
    }

    @Override
    public long fileSize(String songDir, String fileName) throws IOException {
        try {
            String key = prefix + songDir + "/" + fileName;
            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            HeadObjectResponse response = s3.headObject(request);
            return response.contentLength();
        } catch (NoSuchKeyException e) {
            return -1;
        } catch (S3Exception e) {
            throw new IOException("Failed to head S3 object: " + songDir + "/" + fileName, e);
        }
    }

    @Override
    public void storeFile(String songDir, String fileName, InputStream data) throws IOException {
        try {
            String key = prefix + songDir + "/" + fileName;
            byte[] bytes = data.readAllBytes();
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            s3.putObject(request, RequestBody.fromBytes(bytes));
        } catch (S3Exception e) {
            throw new IOException("Failed to store S3 object: " + songDir + "/" + fileName, e);
        }
    }

    @Override
    public boolean fileExists(String songDir, String fileName) throws IOException {
        try {
            String key = prefix + songDir + "/" + fileName;
            s3.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            throw new IOException("Failed to check S3 object: " + songDir + "/" + fileName, e);
        }
    }

    @Override
    public void deleteDirectory(String songDir) throws IOException {
        try {
            String dirPrefix = prefix + songDir + "/";
            ListObjectsV2Request listReq = ListObjectsV2Request.builder()
                    .bucket(bucket)
                    .prefix(dirPrefix)
                    .build();

            ListObjectsV2Response listRes = s3.listObjectsV2(listReq);
            List<ObjectIdentifier> keys = listRes.contents().stream()
                    .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                    .toList();

            if (keys.isEmpty()) {
                log.debug("No S3 objects found for directory '{}', nothing to delete", songDir);
                return;
            }

            DeleteObjectsRequest deleteReq = DeleteObjectsRequest.builder()
                    .bucket(bucket)
                    .delete(Delete.builder().objects(keys).build())
                    .build();
            s3.deleteObjects(deleteReq);
        } catch (NoSuchBucketException e) {
            log.warn("S3 bucket '{}' does not exist, skipping delete for '{}'", bucket, songDir);
        } catch (Exception e) {
            // Best-effort: log and continue — files may already be gone
            log.warn("Failed to delete S3 directory '{}': {}", songDir, e.getMessage());
        }
    }
}
