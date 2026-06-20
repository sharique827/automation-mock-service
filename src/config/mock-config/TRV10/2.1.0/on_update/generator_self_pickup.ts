import { SessionData } from "../../session-types";

const agent = {
  "contact": {
    "phone": "9856798567"
  },
  "person": {
    "name": "Jason Roy"
  }
}
export async function onUpdateGeneratorWithSelfPickup(
  existingPayload: any,
  sessionData: SessionData
) {
  existingPayload.message.order = (sessionData as any)?.onConfirmOrder
  existingPayload.message.order.fulfillments = existingPayload.message.order.fulfillments?.map((item: any) => {
    return {
      ...item,
      state: {
        "descriptor": {
          "code": "RIDE_ASSIGNED"
        }
      },
      agent,
      vehicle: {
        ...item.vehicle, "make": "Bajaj",
        "model": "Compact RE",
        "registration": "KA-01-AD-9876"
      }
    }
  })
  existingPayload.message.order.created_at = sessionData.created_at;
  existingPayload.message.order.updated_at = new Date().toISOString();
  return existingPayload;
}
