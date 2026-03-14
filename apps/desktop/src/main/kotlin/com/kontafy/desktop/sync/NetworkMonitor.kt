package com.kontafy.desktop.sync

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.net.HttpURLConnection
import java.net.URL

class NetworkMonitor(
    private val apiBaseUrl: String = "http://localhost:4001/api",
    private val checkIntervalMs: Long = 30_000,
) {
    private val _isOnline = MutableStateFlow(false)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private var monitorJob: Job? = null
    private var onReconnect: (() -> Unit)? = null

    fun start(scope: CoroutineScope, onReconnect: (() -> Unit)? = null) {
        this.onReconnect = onReconnect
        monitorJob?.cancel()
        monitorJob = scope.launch(Dispatchers.IO) {
            while (isActive) {
                val wasOffline = !_isOnline.value
                val nowOnline = checkConnectivity()
                _isOnline.value = nowOnline

                // Trigger sync when transitioning from offline to online
                if (wasOffline && nowOnline) {
                    onReconnect?.invoke()
                }

                delay(checkIntervalMs)
            }
        }
    }

    fun stop() {
        monitorJob?.cancel()
        monitorJob = null
    }

    private fun checkConnectivity(): Boolean {
        return try {
            val url = URL("$apiBaseUrl/health")
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 5_000
            connection.readTimeout = 5_000
            connection.requestMethod = "GET"
            val responseCode = connection.responseCode
            connection.disconnect()
            responseCode in 200..399
        } catch (_: Exception) {
            false
        }
    }
}
