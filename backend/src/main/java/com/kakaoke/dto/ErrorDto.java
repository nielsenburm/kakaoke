package com.kakaoke.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorDto(
        int status,
        String message,
        String detail
) {
    public ErrorDto(int status, String message) {
        this(status, message, null);
    }
}
