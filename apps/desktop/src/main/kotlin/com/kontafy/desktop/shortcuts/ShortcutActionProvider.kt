package com.kontafy.desktop.shortcuts

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.mutableStateOf

/**
 * CompositionLocal that provides the current shortcut action to all screens.
 * Screens observe this and react to actions like "save", "print", "export", "search".
 * After handling, the screen should set the value back to null.
 */
val LocalShortcutAction = compositionLocalOf<MutableState<String?>> { mutableStateOf(null) }
