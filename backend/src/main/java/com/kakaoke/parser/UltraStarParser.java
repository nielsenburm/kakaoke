package com.kakaoke.parser;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class UltraStarParser {

    private static final Logger log = LoggerFactory.getLogger(UltraStarParser.class);

    public record Headers(
            String title,
            String artist,
            double bpm,
            double gap,
            String mp3,
            String audio,
            String video,
            Double videoGap,
            String cover,
            String background,
            Integer year,
            String language,
            String genre,
            String edition,
            String creator,
            String encoding,
            Double previewStart,
            Map<Integer, String> voiceNames
    ) {
        public String resolvedAudioFile() {
            return audio != null ? audio : mp3;
        }
    }

    public record Note(
            String noteType,
            int beat,
            int duration,
            int pitch,
            String text
    ) {}

    public sealed interface Event {
        record NoteEvent(Note note) implements Event {}
        record LineBreak(int beat) implements Event {}
        record VoiceChange(int voice) implements Event {}
        record End() implements Event {}
    }

    public record ParsedFile(
            Headers headers,
            List<Event> events
    ) {}

    public ParsedFile parse(InputStream inputStream) throws IOException {
        byte[] rawBytes = inputStream.readAllBytes();
        String content = decodeContent(rawBytes);
        return parseContent(content);
    }

    private String decodeContent(byte[] bytes) {
        // Strip BOM if present
        int offset = 0;
        if (bytes.length >= 3 && (bytes[0] & 0xFF) == 0xEF && (bytes[1] & 0xFF) == 0xBB && (bytes[2] & 0xFF) == 0xBF) {
            offset = 3;
        }

        // Try UTF-8 first
        String utf8 = new String(bytes, offset, bytes.length - offset, StandardCharsets.UTF_8);
        if (!utf8.contains("\uFFFD")) {
            return utf8;
        }

        // Fall back to ISO-8859-1 (Windows-1252 superset covers most UltraStar files)
        try {
            return new String(bytes, offset, bytes.length - offset, Charset.forName("windows-1252"));
        } catch (Exception e) {
            return new String(bytes, offset, bytes.length - offset, StandardCharsets.ISO_8859_1);
        }
    }

    private ParsedFile parseContent(String content) {
        String[] lines = content.split("\\r?\\n|\\r");

        Map<String, String> headerMap = new LinkedHashMap<>();
        List<Event> events = new ArrayList<>();
        boolean inBody = false;

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            if (!inBody && trimmed.startsWith("#")) {
                parseHeaderLine(trimmed, headerMap);
            } else {
                inBody = true;
                Event event = parseBodyLine(trimmed);
                if (event != null) {
                    events.add(event);
                }
            }
        }

        Headers headers = buildHeaders(headerMap);
        return new ParsedFile(headers, events);
    }

    private void parseHeaderLine(String line, Map<String, String> headerMap) {
        int colonIdx = line.indexOf(':');
        if (colonIdx < 0) return;

        String key = line.substring(1, colonIdx).trim().toUpperCase(Locale.ROOT);
        String value = line.substring(colonIdx + 1).trim();

        if (!value.isEmpty()) {
            headerMap.put(key, value);
        }
    }

    private Event parseBodyLine(String line) {
        if (line.isEmpty()) return null;

        char first = line.charAt(0);

        return switch (first) {
            case 'E' -> new Event.End();
            case '-' -> parseLineBreak(line);
            case 'P' -> parseVoiceChange(line);
            case ':', '*', 'F', 'R', 'G' -> parseNote(line);
            default -> {
                log.debug("Skipping unknown body line: {}", line);
                yield null;
            }
        };
    }

    private Event.LineBreak parseLineBreak(String line) {
        try {
            String rest = line.substring(1).trim();
            // Line break can be "- beat" or "- beat beat" (relative mode)
            String[] parts = rest.split("\\s+");
            int beat = parts.length > 0 ? Integer.parseInt(parts[0]) : 0;
            return new Event.LineBreak(beat);
        } catch (NumberFormatException e) {
            log.debug("Failed to parse line break: {}", line);
            return new Event.LineBreak(0);
        }
    }

    private Event.VoiceChange parseVoiceChange(String line) {
        try {
            String rest = line.substring(1).trim();
            int voice = rest.isEmpty() ? 1 : Integer.parseInt(rest);
            return new Event.VoiceChange(voice);
        } catch (NumberFormatException e) {
            return new Event.VoiceChange(1);
        }
    }

    private Event.NoteEvent parseNote(String line) {
        try {
            String noteType = String.valueOf(line.charAt(0));

            // Skip type character and exactly one space after it
            int start = 1;
            if (start < line.length() && line.charAt(start) == ' ') {
                start++;
            }
            String rest = line.substring(start);

            // Split by single space with limit 4 to preserve leading spaces in text
            String[] parts = rest.split(" ", 4);
            if (parts.length < 4) {
                log.debug("Note line has too few parts: {}", line);
                return null;
            }

            int beat = Integer.parseInt(parts[0]);
            int duration = Integer.parseInt(parts[1]);
            int pitch = Integer.parseInt(parts[2]);
            String text = parts[3]; // preserves leading spaces (e.g., " this")

            return new Event.NoteEvent(new Note(noteType, beat, duration, pitch, text));
        } catch (Exception e) {
            log.debug("Failed to parse note line: {}", line, e);
            return null;
        }
    }

    private Headers buildHeaders(Map<String, String> map) {
        Map<Integer, String> voiceNames = new LinkedHashMap<>();
        for (int i = 1; i <= 9; i++) {
            String name = map.get("P" + i);
            if (name != null) {
                voiceNames.put(i, name);
            }
        }

        // Also check DUETSINGERP1/DUETSINGERP2 naming convention
        if (voiceNames.isEmpty()) {
            for (int i = 1; i <= 9; i++) {
                String name = map.get("DUETSINGERP" + i);
                if (name != null) {
                    voiceNames.put(i, name);
                }
            }
        }

        return new Headers(
                map.getOrDefault("TITLE", "Unknown"),
                map.getOrDefault("ARTIST", "Unknown"),
                parseEuropeanDouble(map.getOrDefault("BPM", "0")),
                parseEuropeanDouble(map.getOrDefault("GAP", "0")),
                map.get("MP3"),
                map.get("AUDIO"),
                map.get("VIDEO"),
                parseDoubleOrNull(map.get("VIDEOGAP")),
                map.get("COVER"),
                map.get("BACKGROUND"),
                parseIntOrNull(map.get("YEAR")),
                map.get("LANGUAGE"),
                map.get("GENRE"),
                map.get("EDITION"),
                map.get("CREATOR"),
                map.get("ENCODING"),
                parseDoubleOrNull(map.get("PREVIEWSTART"))
                        != null ? parseDoubleOrNull(map.get("PREVIEWSTART")) : parseDoubleOrNull(map.get("PREVIEW")),
                voiceNames.isEmpty() ? null : voiceNames
        );
    }

    static double parseEuropeanDouble(String s) {
        if (s == null || s.isBlank()) return 0.0;
        // European format uses comma as decimal separator
        return Double.parseDouble(s.replace(',', '.'));
    }

    private static Integer parseIntOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Double parseDoubleOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Double.parseDouble(s.replace(',', '.').trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Beat-to-ms conversion: one beat = 15000/BPM ms (UltraStar BPM = quarter-notes/min)
    public static double beatToMs(int beat, double bpm, double gap) {
        if (bpm <= 0) return gap;
        return beat * (15000.0 / bpm) + gap;
    }

    public static double beatDurationToMs(int duration, double bpm) {
        if (bpm <= 0) return 0;
        return duration * (15000.0 / bpm);
    }
}
