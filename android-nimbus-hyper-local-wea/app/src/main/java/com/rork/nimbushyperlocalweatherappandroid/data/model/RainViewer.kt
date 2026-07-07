package com.rork.nimbushyperlocalweatherappandroid.data.model

import kotlinx.serialization.Serializable

@Serializable
data class RainViewerCoverage(
    val host: String,
    val radar: List<RainViewerFrame>,
    val satellite: List<RainViewerFrame> = emptyList()
)

@Serializable
data class RainViewerFrame(
    val time: Long,
    val path: String,
    val size: IntArray? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is RainViewerFrame) return false
        return time == other.time && path == other.path
    }
    override fun hashCode(): Int = time.hashCode() * 31 + path.hashCode()
}

@Serializable
data class RainViewerPastNowcast(
    val nowcasts: List<RainViewerNowcastItem> = emptyList()
)

@Serializable
data class RainViewerNowcastItem(
    val time: Long,
    val path: String,
    val start: Long = 0,
    val end: Long = 0,
    val nRadars: Int = 0
)
