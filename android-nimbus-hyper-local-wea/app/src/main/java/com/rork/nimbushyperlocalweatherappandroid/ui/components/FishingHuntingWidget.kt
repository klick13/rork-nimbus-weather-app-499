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
import androidx.compose.material.icons.filled.Phishing
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
import com.rork.nimbushyperlocalweatherappandroid.data.WeatherDetails
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun FishingHuntingWidget(
    details: WeatherDetails,
    modifier: Modifier = Modifier,
) {
    val pressureScore = when (details.pressure) {
        in 1000..1020 -> "Excellent"
        in 990..1000, in 1020..1030 -> "Good"
        else -> "Fair"
    }
    val windScore = when (details.windSpeed) {
        in 0..10 -> "Excellent"
        in 10..20 -> "Good"
        else -> "Poor"
    }
    val fishingRating = if (pressureScore == "Excellent" && windScore != "Poor") 5
        else if (pressureScore == "Good" && windScore == "Excellent") 4
        else if (windScore == "Poor") 2
        else 3

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(CardBackground, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                imageVector = Icons.Filled.Phishing,
                contentDescription = "Fishing",
                tint = Accent,
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = "Fishing & Hunting",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            ConditionMetric("Fishing", fishingRating, NeonGreen)
            ConditionMetric("Hunting", if (windScore == "Poor") 2 else 4, NeonYellow)
            ConditionMetric("Pressure", details.pressure, Accent, "hPa")
        }
    }
}

@Composable
private fun ConditionMetric(label: String, value: Int, color: Color, suffix: String = "") {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label,
            fontSize = 11.sp,
            color = TextSecondary,
        )
        Spacer(modifier = Modifier.height(4.dp))
        if (suffix.isEmpty()) {
            Row {
                repeat(5) { i ->
                    Box(
                        modifier = Modifier
                            .size(width = 6.dp, height = 8.dp)
                            .padding(end = 1.dp)
                            .background(
                                if (i < value) color else color.copy(alpha = 0.15f),
                                RoundedCornerShape(1.dp),
                            ),
                    )
                }
            }
            Text(
                text = "$value/5",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = color,
                modifier = Modifier.padding(top = 4.dp),
            )
        } else {
            Text(
                text = "$value $suffix",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = color,
            )
        }
    }
}
