/**
 * Prisma enum'larını GraphQL enum tipleri olarak expose et.
 * Her enum'un Pothos ref'i export edilir; diğer schema dosyaları bunları kullanır.
 */
import {
  AccountType,
  CircleType,
  ContributionSource,
  ContributionStatus,
  GoalStatus,
  NotificationType,
  PriceAlertDirection,
  RuleFrequency,
  SpendingCategory,
  SubscriptionStatus,
} from '@prisma/client';

import { builder } from '../builder';

export const SpendingCategoryRef = builder.enumType(SpendingCategory, {
  name: 'SpendingCategory',
  description: '15 sabit Türkçe harcama kategorisi (ADR-007)',
});

export const SubscriptionStatusRef = builder.enumType(SubscriptionStatus, {
  name: 'SubscriptionStatus',
});
export const GoalStatusRef = builder.enumType(GoalStatus, { name: 'GoalStatus' });
export const PriceAlertDirectionRef = builder.enumType(PriceAlertDirection, {
  name: 'PriceAlertDirection',
});
export const RuleFrequencyRef = builder.enumType(RuleFrequency, { name: 'RuleFrequency' });
export const AccountTypeRef = builder.enumType(AccountType, { name: 'AccountType' });
export const CircleTypeRef = builder.enumType(CircleType, { name: 'CircleType' });
export const NotificationTypeRef = builder.enumType(NotificationType, {
  name: 'NotificationType',
});
export const ContributionSourceRef = builder.enumType(ContributionSource, {
  name: 'ContributionSource',
});
export const ContributionStatusRef = builder.enumType(ContributionStatus, {
  name: 'ContributionStatus',
});

/** Period helper enum'u — query filter'ları için */
export const PeriodEnum = builder.enumType('Period', {
  values: ['LAST_7D', 'LAST_30D', 'LAST_90D', 'ALL'] as const,
});
