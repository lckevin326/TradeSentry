import {
  DecisionBriefConfigurationError,
  DecisionBriefUpstreamError,
  DecisionBriefValidationError,
  generateDecisionBrief,
  type DecisionBriefInput,
} from '../../../../lib/ai/decision-brief'

type DecisionBriefRouteDeps = {
  generateBrief?: typeof generateDecisionBrief
}

export async function postDecisionBriefRequest(
  request: Request,
  deps: DecisionBriefRouteDeps = {},
): Promise<Response> {
  try {
    let payload: unknown

    try {
      payload = (await request.json()) as unknown
    } catch {
      throw new DecisionBriefValidationError('Request body must be valid JSON')
    }

    if (typeof payload !== 'object' || payload === null) {
      throw new DecisionBriefValidationError('Request body must be a JSON object')
    }

    const result = await (deps.generateBrief ?? generateDecisionBrief)(payload as DecisionBriefInput)
    return Response.json({ ok: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (error instanceof DecisionBriefValidationError) {
      return Response.json({ ok: false, error: message }, { status: 400 })
    }

    if (error instanceof DecisionBriefConfigurationError) {
      return Response.json({ ok: false, error: message }, { status: 500 })
    }

    if (error instanceof DecisionBriefUpstreamError) {
      return Response.json({ ok: false, error: message }, { status: 502 })
    }

    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  return postDecisionBriefRequest(request)
}
