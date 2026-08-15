import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface EntryReceiptProps {
  teamName?: string
  week?: number
  season?: number
  amount?: string
}

function EntryReceipt({
  teamName = 'Manager',
  week = 1,
  season = 2026,
  amount = '$5.00',
}: EntryReceiptProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Week ${week} entry confirmed — you're in the pot`}</Preview>
      <Body style={{ backgroundColor: '#0B162A', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0 }}>
        <Container style={{ padding: '32px 24px', maxWidth: '520px' }}>
          <Text style={{ color: '#00E676', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>
            Gridiron Confidence
          </Text>
          <Heading style={{ color: '#FFFFFF', fontSize: '26px', margin: '8px 0 16px' }}>
            Week {week} entry confirmed
          </Heading>
          <Text style={{ color: '#C7D0DB', fontSize: '15px', lineHeight: '22px' }}>
            {teamName}, your {amount} buy-in for Week {week} of the {season} season is paid. Your
            picks are unlocked — assign your confidence points before the Wednesday 6:00 PM lock.
          </Text>
          <Hr style={{ borderColor: '#1D2B44', margin: '24px 0' }} />
          <Section>
            <Text style={{ color: '#8FA0B5', fontSize: '13px', margin: '4px 0' }}>
              Season: {season} · Week: {week}
            </Text>
            <Text style={{ color: '#8FA0B5', fontSize: '13px', margin: '4px 0' }}>
              Amount paid: {amount}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: EntryReceipt,
  displayName: 'Weekly Entry Receipt',
  subject: (data: Record<string, any>) => `Week ${data['week'] ?? 1} entry confirmed — $5 buy-in received`,
  previewData: { teamName: 'Steel Curtain', week: 1, season: 2026, amount: '$5.00' },
} satisfies TemplateEntry
