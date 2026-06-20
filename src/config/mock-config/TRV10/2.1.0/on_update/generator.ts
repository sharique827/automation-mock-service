import { SessionData } from "../../session-types";

const agent = {
  "contact": {
    "phone": "9856798567"
  },
  "person": {
    "name": "Jason Roy"
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function onUpdateGenerator(
  existingPayload: any,
  sessionData: SessionData,
) {
  existingPayload.message.order = (sessionData as any).onConfirmOrder
    existingPayload.message.order.fulfillments =
  existingPayload.message.order.fulfillments?.map((item: any) => ({
    ...item,
    state: {
      descriptor: {
        code: "RIDE_ASSIGNED",
      },
    },
    agent,
    stops: item.stops.map((stop: any) => {
      if (stop.type === "START") {
        const { instructions, ...restStop } = stop;

        return {
          ...restStop,
          authorization: {
            status: "UNCLAIMED",
            token: generateOTP(),
            type: "OTP",
            valid_to: new Date(
              Date.now() + 30 * 60000
            ).toISOString(),
          },
        };
      }

      return stop;
    }),
    vehicle: {
      ...item.vehicle,
      make: "Bajaj",
      model: "Compact RE",
      registration: "KA-01-AD-9876",
    },
  }));
  existingPayload.message.order.created_at = sessionData.created_at;
  existingPayload.message.order.updated_at = new Date().toISOString();
  return existingPayload;
}
