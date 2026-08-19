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
import androidx.compose.material.icons.filled.NightsStay
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempHigh
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun SunsetQualityScore(
    humidity: Int,
    visibility: Int,
    windSpeed: Int,
    sunset: String,
    cloudCover: Int,
    modifier: Modifier = Modifier,
) {
    val score = run {
        var s = 50
        s += when {
            humidity in 30..60 -> 20
            humidity in 60..80 -> 10
            humidity > 80 -> -10
            else -> 5
        }
        s += when {
            cloudCover in 30..60 -> 20
            cloudCover in 15..30 -> 15
            cloudCover in 60..80 -> 10
            else -> 0
        }
        s -= minOf(windSpeed / 2, 15)
        s = minOf(s, 100)
        maxOf(s, 0)
    }

    val rating = when (score) {
        in 80..100 -> "Excellent" to NeonGreen
        in 60..79 -> "Good" to NeonYellow
        in 40..59 -> "Fair" to Color(0xFFFF9600)
        else -> "Poor" to TempHigh
    }
    val (ratingText, ratingColor) = rating

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
                    imageVector = Icons.Filled.NightsStay,
                    contentDescription = "Sunset",
                    tint = ratingColor,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "Sunset Quality",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )
            }
            Box(
                modifier = Modifier
                        .background(ratingColor.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = ratingText,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = ratingColor,
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "$score",
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = ratingColor,
                )
                Text(
                    text = "out of 100",
                    fontSize = 11.sp,
                    color = TextSecondary,
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = sunset,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Accent,
                )
                Text(
                    text = "sunset time",
                    fontSize = 11.sp,
                    color = TextSecondary,
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            TempHigh,
                            NeonYellow,
                            NeonGreen,
                            NeonPurple,
                        ),
                    ),
                    RoundedCornerShape(3.dp),
                ),
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("0", fontSize = 10.sp, color = TextSecondary)
            Text("100", fontSize = 10.sp, color = TextSecondary)
        }
    }
}

