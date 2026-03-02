package com.kakaoke.exception;

import com.kakaoke.dto.ErrorDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SongNotFoundException.class)
    public ResponseEntity<ErrorDto> handleNotFound(SongNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorDto(404, ex.getMessage()));
    }

    @ExceptionHandler(ImportException.class)
    public ResponseEntity<ErrorDto> handleImportError(ImportException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorDto(400, ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorDto> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorDto(400, ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorDto> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorDto(403, "Access denied"));
    }

    /**
     * Client disconnected (e.g. browser <audio> cancels initial GET to retry with Range).
     * This is normal browser behavior — silently ignore it.
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleClientDisconnect(AsyncRequestNotUsableException ex) {
        log.debug("Client disconnected: {}", ex.getMessage());
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<ErrorDto> handleIOException(IOException ex) {
        if (isClientAbort(ex)) {
            log.debug("Client aborted connection: {}", ex.getMessage());
            return null;
        }
        log.error("IO exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorDto(500, "Internal server error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDto> handleGeneric(Exception ex) {
        if (isClientAbort(ex)) {
            log.debug("Client aborted connection: {}", ex.getMessage());
            return null;
        }
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorDto(500, "Internal server error", ex.getMessage()));
    }

    private static boolean isClientAbort(Throwable ex) {
        Throwable cause = ex;
        while (cause != null) {
            String msg = cause.getMessage();
            if (msg != null && (msg.contains("Broken pipe") || msg.contains("Connection reset"))) {
                return true;
            }
            if (cause instanceof AsyncRequestNotUsableException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
