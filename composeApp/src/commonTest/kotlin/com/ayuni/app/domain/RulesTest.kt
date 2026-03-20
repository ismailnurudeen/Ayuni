package com.ayuni.app.domain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class RulesTest {
    @Test
    fun freezeTriggersAfterTwoIncidents() {
        val freeze = MatchingRules.determineFreeze(noShowsIn90Days = 1, lateCancellationsIn90Days = 1)
        assertNotNull(freeze)
        assertEquals(30, freeze.freezeDays)
    }

    @Test
    fun chatOpensTwoHoursBeforeDate() {
        assertTrue(ChatPolicy.isLogisticsChatOpen(2))
        assertFalse(ChatPolicy.isLogisticsChatOpen(3))
    }

    @Test
    fun refundsWhenCounterpartTimesOut() {
        assertTrue(RefundPolicy.shouldRefund(platformCancelled = false, venueCancelled = false, counterpartTimedOut = true))
    }
}
