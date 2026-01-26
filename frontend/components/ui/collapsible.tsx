'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { useId } from 'react'

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  id,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger> & { id?: string }) {
  // Generate a stable ID if none is provided
  const generatedId = useId()
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      id={id ?? generatedId}
      {...props}
    />
  )
}

function CollapsibleContent({
  id,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent> & { id?: string }) {
  const generatedId = useId()
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      id={id ?? generatedId}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
