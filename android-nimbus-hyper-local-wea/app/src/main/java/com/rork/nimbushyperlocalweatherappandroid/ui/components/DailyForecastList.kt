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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.data.DailyForecast
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.PrecipBlue
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempHigh
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempLow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun DailyForecastList(
    daily: List<DailyForecast>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = "7-Day Forecast",
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextSecondary,
            modifier = Modifier.padding(bottom = 12.dp),
        )
        daily.forEachIndexed { index, day ->
            DailyRow(day, index == daily.lastIndex)
            if (index != daily.lastIndex) {
                Spacer(modifier = Modifier.height(1.dp))
            }
        }
    }
}

@Composable
private fun DailyRow(day: DailyForecast, isLast: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CardBackground, RoundedCornerShape(12.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        // Day name
        Column(modifier = Modifier.width(70.dp)) {
            Text(
                text = day.day,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
            )
            Text(
                text = day.date,
                fontSize = 11.sp,
                color = TextSecondary,
            )
        }

        // Icon
        Icon(
            imageVector = iconForCondition(day.condition.icon),
            contentDescription = day.condition.main,
            tint = Accent,
            modifier = Modifier.size(28.dp),
        )

        // Precip
        if (day.precipChance > 0) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
                modifier = Modifier.width(50.dp),
            ) {
                Text(
                    text = "${day.precipChance}%",
                    fontSize = 12.sp,
                    color = PrecipBlue,
                )
            }
        } else {
            Spacer(modifier = Modifier.width(50.dp))
        }

        // Temps
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = "${day.low}°",
                fontSize = 16.sp,
                color = TempLow,
            )
            Text(
                text = "${day.high}°",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = TempHigh,
            )
        }
    }
}
