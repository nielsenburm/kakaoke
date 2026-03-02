package com.kakaoke.parser;

import com.kakaoke.parser.UltraStarParser.*;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class UltraStarParserTest {

    private final UltraStarParser parser = new UltraStarParser();

    @Test
    void parsesHeadersWithEuropeanDecimals() throws IOException {
        String content = """
                #TITLE:Bohemian Rhapsody
                #ARTIST:Queen
                #BPM:341,2
                #GAP:3165,3
                #MP3:audio.mp3
                #COVER:cover.png
                #YEAR:1975
                #LANGUAGE:English
                #EDITION:Rock Classics
                : 0 6 65 Is
                E
                """;

        ParsedFile result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
        Headers h = result.headers();

        assertEquals("Bohemian Rhapsody", h.title());
        assertEquals("Queen", h.artist());
        assertEquals(341.2, h.bpm(), 0.01);
        assertEquals(3165.3, h.gap(), 0.01);
        assertEquals("audio.mp3", h.mp3());
        assertEquals("cover.png", h.cover());
        assertEquals(1975, h.year());
        assertEquals("English", h.language());
        assertEquals("Rock Classics", h.edition());
    }

    @Test
    void parsesNotesAndLineBreaks() throws IOException {
        String content = """
                #TITLE:Test
                #ARTIST:Test
                #BPM:100
                #GAP:0
                : 0 4 60 Hel
                : 4 4 62 lo
                - 8
                * 8 8 64 World
                F 16 4 0 yeah
                E
                """;

        ParsedFile result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        assertEquals(6, result.events().size());
        assertInstanceOf(Event.NoteEvent.class, result.events().get(0));
        assertInstanceOf(Event.NoteEvent.class, result.events().get(1));
        assertInstanceOf(Event.LineBreak.class, result.events().get(2));
        assertInstanceOf(Event.NoteEvent.class, result.events().get(3));
        assertInstanceOf(Event.NoteEvent.class, result.events().get(4));
        assertInstanceOf(Event.End.class, result.events().get(5));

        // Check note types
        Note n0 = ((Event.NoteEvent) result.events().get(0)).note();
        assertEquals(":", n0.noteType());
        assertEquals(0, n0.beat());
        assertEquals(4, n0.duration());
        assertEquals(60, n0.pitch());
        assertEquals("Hel", n0.text());

        Note n3 = ((Event.NoteEvent) result.events().get(3)).note();
        assertEquals("*", n3.noteType());

        Note n4 = ((Event.NoteEvent) result.events().get(4)).note();
        assertEquals("F", n4.noteType());
    }

    @Test
    void beatToMsConversion() {
        // BPM=100 -> one beat = 15000/100 = 150ms
        assertEquals(150.0, UltraStarParser.beatToMs(1, 100, 0), 0.001);
        assertEquals(1150.0, UltraStarParser.beatToMs(1, 100, 1000), 0.001);
        assertEquals(300.0, UltraStarParser.beatDurationToMs(2, 100), 0.001);
    }

    @Test
    void parsesVoiceChanges() throws IOException {
        String content = """
                #TITLE:Duet
                #ARTIST:Band
                #BPM:200
                #GAP:0
                P1
                : 0 4 60 Hello
                - 4
                P2
                : 4 4 62 World
                E
                """;

        ParsedFile result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        boolean hasVoiceChange = result.events().stream()
                .anyMatch(e -> e instanceof Event.VoiceChange);
        assertTrue(hasVoiceChange);
    }

    @Test
    void handlesEmptyAndBrokenLines() throws IOException {
        String content = """
                #TITLE:Test
                #ARTIST:Test
                #BPM:100
                #GAP:0

                : 0 4 60 OK
                UNKNOWN LINE
                E
                """;

        ParsedFile result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        // Should parse the valid note and skip the unknown line
        long noteCount = result.events().stream()
                .filter(e -> e instanceof Event.NoteEvent)
                .count();
        assertEquals(1, noteCount);
    }

    @Test
    void preservesLeadingSpacesInTokenText() throws IOException {
        String content = """
                #TITLE:Test
                #ARTIST:Test
                #BPM:100
                #GAP:0
                : 0 4 60 Is
                : 4 4 62  this
                : 8 4 64  the
                E
                """;

        ParsedFile result = parser.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));

        Note n1 = ((Event.NoteEvent) result.events().get(1)).note();
        assertEquals(" this", n1.text());

        Note n2 = ((Event.NoteEvent) result.events().get(2)).note();
        assertEquals(" the", n2.text());
    }
}
