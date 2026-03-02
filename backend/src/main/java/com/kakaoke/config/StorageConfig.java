package com.kakaoke.config;

import com.kakaoke.storage.FileStorageProvider;
import com.kakaoke.storage.S3StorageProvider;
import com.kakaoke.storage.StorageProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;

import java.nio.file.Path;

@Configuration
public class StorageConfig {

    @Value("${kakaoke.storage.type:file}")
    private String storageType;

    @Value("${kakaoke.storage.file.root:./songs}")
    private String fileRoot;

    @Value("${kakaoke.storage.s3.bucket:}")
    private String s3Bucket;

    @Value("${kakaoke.storage.s3.prefix:songs/}")
    private String s3Prefix;

    @Value("${kakaoke.storage.s3.region:eu-central-1}")
    private String s3Region;

    @Value("${kakaoke.storage.s3.access-key:}")
    private String s3AccessKey;

    @Value("${kakaoke.storage.s3.secret-key:}")
    private String s3SecretKey;

    @Bean
    public StorageProvider storageProvider() {
        if ("s3".equalsIgnoreCase(storageType)) {
            S3ClientBuilder builder = S3Client.builder()
                    .region(Region.of(s3Region));

            if (!s3AccessKey.isEmpty() && !s3SecretKey.isEmpty()) {
                builder.credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(s3AccessKey, s3SecretKey)));
            } else {
                builder.credentialsProvider(DefaultCredentialsProvider.create());
            }

            return new S3StorageProvider(builder.build(), s3Bucket, s3Prefix);
        }
        return new FileStorageProvider(Path.of(fileRoot));
    }
}
