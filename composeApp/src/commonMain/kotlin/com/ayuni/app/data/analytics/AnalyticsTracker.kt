package com.ayuni.app.data.analytics

import com.ayuni.app.data.api.AnalyticsEventPayload
import com.ayuni.app.data.api.AyuniApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Clock

/**
 * Lightweight analytics tracker that batches events and flushes periodically.
 * Call [track] from any screen; events are sent in batch to the backend.
 */
class AnalyticsTracker(
    private val apiClient: AyuniApiClient,
    private val batchSize: Int = 10,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val mutex = Mutex()
    private val buffer = mutableListOf<AnalyticsEventPayload>()

    fun track(eventName: String, properties: Map<String, String> = emptyMap()) {
        scope.launch {
            val event = AnalyticsEventPayload(
                eventName = eventName,
                properties = properties,
                timestamp = Clock.System.now().toString(),
            )
            mutex.withLock { buffer.add(event) }
            if (buffer.size >= batchSize) {
                flush()
            }
        }
    }

    fun flush() {
        scope.launch {
            val events: List<AnalyticsEventPayload>
            mutex.withLock {
                if (buffer.isEmpty()) return@launch
                events = buffer.toList()
                buffer.clear()
            }
            try {
                apiClient.sendAnalyticsBatch(events)
            } catch (_: Exception) {
                // Re-add events on failure so they retry next flush
                mutex.withLock { buffer.addAll(0, events) }
            }
        }
    }
}
