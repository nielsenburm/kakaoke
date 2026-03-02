package com.kakaoke.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ThumbnailService {

    private static final Logger log = LoggerFactory.getLogger(ThumbnailService.class);
    private static final int THUMBNAIL_SIZE = 200;

    public record Thumbnail(byte[] data, String contentType) {}

    /**
     * Generate a JPEG thumbnail from the given image bytes.
     * Returns null if the image cannot be read or processed.
     */
    public Thumbnail generate(byte[] imageBytes) {
        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) {
                log.warn("ImageIO could not read image ({} bytes)", imageBytes.length);
                return null;
            }

            int origW = original.getWidth();
            int origH = original.getHeight();

            double scale = Math.min(
                    (double) THUMBNAIL_SIZE / origW,
                    (double) THUMBNAIL_SIZE / origH
            );
            if (scale >= 1.0) {
                scale = 1.0;
            }

            int newW = Math.max(1, (int) Math.round(origW * scale));
            int newH = Math.max(1, (int) Math.round(origH * scale));

            BufferedImage thumbnail = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = thumbnail.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING,
                    RenderingHints.VALUE_RENDER_QUALITY);
            g2d.drawImage(original, 0, 0, newW, newH, null);
            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "JPEG", baos);

            return new Thumbnail(baos.toByteArray(), "image/jpeg");
        } catch (IOException e) {
            log.warn("Failed to generate thumbnail: {}", e.getMessage());
            return null;
        }
    }
}
