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
import androidx.compose.material.icons.filled.Water
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
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PrecipBlue
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun FloodGateWidget(
    precipChance: Int = 0,
    humidity: Int = 0,
    modifier: Modifier = Modifier,
) {
    val riskLevel = when {
        precipChance >= 70 && humidity >= 80 -> "High" to PrecipBlue
        precipChance >= 50 && humidity >= 70 -> "Moderate" to NeonYellow
        precipChance >= 30 -> "Low" to NeonGreen
        else -> "Minimal" to NeonGreen
    }
    val (level, color) = riskLevel

    val advice = when (level) {
        "High" -> "Heavy rainfall expected. Monitor local flood warnings. Avoid low-lying areas and underpasses."
        "Moderate" -> "Moderate precipitation likely. Stay alert near waterways and low-lying roads."
        "Low" -> "Light precipitation possible. No significant flood risk expected."
        else -> "No flood risk. Conditions are dry and stable."
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
                    imageVector = Icons.Filled.Water,
                    contentDescription = "Flood",
                    tint = color,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "Flood Risk",
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
            text = advice,
            fontSize = 13.sp,
            color = TextSecondary,
            lineHeight = 18.sp,
        )

        if (precipChance > 0) {
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$precipChance%",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = PrecipBlue,
                    )
                    Text(
                        text = "Rain Chance",
                        fontSize = 11.sp,
                        color = TextSecondary,
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "$humidity%",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Accent,
                    )
                    Text(
                        text = "Humidity",
                        fontSize = 11.sp,
                        color = TextSecondary,
                    )
                }
            }
        }
    }
}
