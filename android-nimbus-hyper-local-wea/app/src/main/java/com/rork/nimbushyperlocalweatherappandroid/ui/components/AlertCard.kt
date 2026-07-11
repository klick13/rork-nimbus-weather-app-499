package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.WeatherAlert
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun AlertCard(
    alert: WeatherAlert,
    modifier: Modifier = Modifier,
) {
    val (bgTint, borderColor) = when (alert.severity) {
        "extreme" -> Color(0x33FF3D71) to Color(0xFFFF3D71)
        "severe" -> Color(0x26FF6B35) to Color(0xFFFF6B35)
        "moderate" -> Color(0x26F0FF00) to NeonYellow
        "minor" -> Color(0x1A3DFF9A) to NeonGreen
        else -> CardBackground to CardBorder
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(bgTint, RoundedCornerShape(16.dp))
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Warning,
                contentDescription = "Alert",
                tint = borderColor,
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = alert.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = alert.description,
            fontSize = 13.sp,
            color = TextSecondary,
            lineHeight = 18.sp,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = "${alert.startTime} – ${alert.endTime}",
            fontSize = 11.sp,
            color = borderColor,
            fontWeight = FontWeight.Medium,
        )
    }
}
