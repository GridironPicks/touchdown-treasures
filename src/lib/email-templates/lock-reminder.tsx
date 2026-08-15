import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface LockReminderProps {
  teamName?: string
  week?: number
  picksUrl?: string
}

function LockReminder({
  teamName = 'Manager',
  week = 1,
  picksUrl = 'https://gridironconfidence.com/picks',
}: LockReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Week ${week} locks Wednesday 6:00 PM — your entry is unpaid`}</Preview>
      <Body style={{ backgroundColor: '#0B162A', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0 }}>
        <Container style={{ padding: '32px 24px', maxWidth: '520px' }}>
          <Text style={{ color: '#00E676', letterSpacing: '2px', fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>
            Gridiron Confidence
          </Text>
          <Heading style={{ color: '#FFFFFF', fontSize: '26px', margin: '8px 0 16px' }}>
            Week {week} locks Wednesday 6:00 PM
          </Heading>
          <Text style={{ color: '#C7D0DB', fontSize: '15px', lineHeight: '22px' }}>
            {teamName}, your Week {week} confidence picks aren't in yet. It's free to play — get
            them submitted before the deadline. No late entries.
          </Text>

          <Button
            href={picksUrl}
            style={{
              backgroundColor: '#00E676',
              color: '#0B162A',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '15px',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Make my picks
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: LockReminder,
  displayName: 'Wednesday Lock Reminder',
  subject: (data: Record<string, any>) =>
    `Week ${data['week'] ?? 1} picks lock Wednesday 6PM`,

  previewData: { teamName: 'Steel Curtain', week: 1, picksUrl: 'https://gridironconfidence.com/picks' },
} satisfies TemplateEntry
