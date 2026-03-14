package com.kontafy.desktop.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val KontafyColorScheme = lightColorScheme(
    primary = KontafyColors.Navy,
    onPrimary = KontafyColors.White,
    primaryContainer = KontafyColors.NavyLight,
    onPrimaryContainer = KontafyColors.White,

    secondary = KontafyColors.Green,
    onSecondary = KontafyColors.White,
    secondaryContainer = KontafyColors.GreenLight,
    onSecondaryContainer = KontafyColors.White,

    tertiary = KontafyColors.Muted,
    onTertiary = KontafyColors.White,

    background = KontafyColors.Surface,
    onBackground = KontafyColors.Ink,

    surface = KontafyColors.SurfaceElevated,
    onSurface = KontafyColors.Ink,
    surfaceVariant = KontafyColors.Surface,
    onSurfaceVariant = KontafyColors.InkSecondary,

    outline = KontafyColors.Border,
    outlineVariant = KontafyColors.BorderLight,

    error = KontafyColors.Error,
    onError = KontafyColors.White,
)

@Composable
fun KontafyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = KontafyColorScheme,
        typography = KontafyTypography,
        content = content,
    )
}
