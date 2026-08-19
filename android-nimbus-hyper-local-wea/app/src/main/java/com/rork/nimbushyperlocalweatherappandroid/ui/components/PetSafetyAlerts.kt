package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempHigh
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun PetSafetyAlerts(
    temp: Int,
    humidity: Int,
    windSpeed: Int,
    conditionId: String,
    modifier: Modifier = Modifier,
) {
    val dangerLevel = when {
        temp >= 100 -> "Extreme" to TempHigh
        temp >= 85 -> "High" to Color(0xFFFF9600)
        temp >= 70 -> "Moderate" to NeonYellow
        temp <= 32 -> "High" to Accent
        temp <= 45 -> "Moderate" to NeonYellow
        else -> "Low" to NeonGreen
    }

    val (level, color) = dangerLevel

    val alertMessage = when {
        temp >= 100 -> "Pavement can burn paws. Walk pets early morning only. Provide shade and water."
        temp >= 85 -> "Hot weather. Avoid midday walks. Test pavement with your hand for 7 seconds."
        temp <= 32 -> "Freezing temps. Limit outdoor time. Protect paws from ice and salt."
        temp <= 45 -> "Cold weather. Short-haired pets may need a sweater."
        else -> "Conditions are comfortable for pets. Normal outdoor activity is fine."
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(CardBackground, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.Pets,
                    contentDescription = "Pet Safety",
                    tint = color,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "Pet Safety",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )
            }
            Box(
                modifier = Modifier
                        .background(color.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = level,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = color,
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = alertMessage,
            fontSize = 13.sp,
            color = TextSecondary,
            lineHeight = 18.sp,
        )

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            PetMetric("Temp", "${temp}°", color)
            PetMetric("Humidity", "${humidity}%", NeonGreen)
            PetMetric("Wind", "${windSpeed}", Accent)
        }
    }
}

@Composable
private fun PetMetric(label: String, value: String, color: Color) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = TextSecondary,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = color,
        )
    }
}
