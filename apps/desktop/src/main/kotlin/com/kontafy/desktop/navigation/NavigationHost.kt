package com.kontafy.desktop.navigation

import androidx.compose.runtime.*

class NavigationState {
    var currentScreen by mutableStateOf<Screen>(Screen.Login)
        private set

    private val backStack = mutableListOf<Screen>()

    fun navigateTo(screen: Screen) {
        backStack.add(currentScreen)
        currentScreen = screen
    }

    fun goBack(): Boolean {
        if (backStack.isEmpty()) return false
        currentScreen = backStack.removeLast()
        return true
    }

    val canGoBack: Boolean
        get() = backStack.isNotEmpty()
}

@Composable
fun rememberNavigationState(): NavigationState {
    return remember { NavigationState() }
}
