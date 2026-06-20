import { SessionData } from "../../session-types";

function updateFulfillmentRouteTags(tags: any[]) {
  return tags.map((tag) => {
    if (tag.descriptor?.code === "ROUTE_INFO" && Array.isArray(tag.list)) {
      return {
        ...tag,
        list: tag.list.map((t: any) => {
          if (t.descriptor.code === "ENCODED_POLYLINE") {
            return { ...t, value: t.value + "A" };
          }
          if (t.descriptor.code === "WAYPOINTS") {
            const waypoints = JSON.parse(t.value);
            const updatedWaypoints = waypoints.map((wp: any) => {
              const [lat, lng] = wp.gps.split(",").map(Number);
              return {
                gps: `${(lat + 0.00001).toFixed(6)},${(lng + 0.00001).toFixed(
                  6,
                )}`,
              };
            });
            return { ...t, value: JSON.stringify(updatedWaypoints) };
          }
          return t;
        }),
      };
    }
    return tag;
  });
}

// Helper function to slightly modify distance and ETA
function updateItemInfoTags(tags: any[]) {
  return tags.map((tag) => {
    if (tag.descriptor?.code === "INFO" && Array.isArray(tag.list)) {
      return {
        ...tag,
        list: tag.list.map((t: any) => {
          if (t.descriptor.code === "DISTANCE_TO_NEAREST_DRIVER_METER") {
            // Slightly adjust distance, e.g., add 5 meters
            const distance = Number(t.value || 0);
            return { ...t, value: (distance - 5).toString() };
          }
          if (t.descriptor.code === "ETA_TO_NEAREST_DRIVER_MIN") {
            // Slightly adjust ETA, e.g., add 1 minute
            const eta = Number(t.value || 0);
            return { ...t, value: (eta - 1).toString() };
          }
          return t;
        }),
      };
    }
    return tag;
  });
}

function updateSettlementAmount(terms: any[], quote: any) {
  const total = Number(quote?.price?.value || 0);

  terms.forEach((termBlock) => {
    if (!termBlock.list) return;

    const buyerFeeItem =
      termBlock.list.find(
        (i: any) => i.descriptor?.code === "BUYER_FINDER_FEES_PERCENTAGE",
      ) || 1;
    const settlementItem = termBlock.list.find(
      (i: any) => i.descriptor?.code === "SETTLEMENT_AMOUNT",
    );

    if (buyerFeeItem && settlementItem) {
      const percentage = Number(buyerFeeItem.value || 0);
      const settlementAmount = ((total * percentage) / 100).toFixed(2);
      settlementItem.value = settlementAmount;
    }
  });

  return terms;
}

export async function onInitMultipleStopsGenerator(
  existingPayload: any,
  sessionData: SessionData,
) {
  const randomPaymentId = Math.random().toString(36).substring(2, 15);

  if (sessionData.items.length > 0) {
    existingPayload.message.order.items = sessionData.items;
    existingPayload.message.order.items[0]["payment_ids"] = [randomPaymentId];
  }
  if (sessionData.selected_fulfillments.length > 0) {
    existingPayload.message.order.fulfillments =
      sessionData.selected_fulfillments;
    existingPayload.message.order.fulfillments[0]["customer"] = (sessionData as any)?.initCustomer;
    // existingPayload.message.order.fulfillments[0]["type"] = "DELIVERY"

    if (Array.isArray(existingPayload.message.order.fulfillments[0].tags)) {
      existingPayload.message.order.fulfillments[0].tags =
        updateFulfillmentRouteTags(
          existingPayload.message.order.fulfillments[0].tags,
        );
    }
  }
  if (sessionData.payments.length > 0) {
    existingPayload.message.order.payments[0]["collected_by"] =
      sessionData.collected_by;
    existingPayload.message.order.payments[0]["id"] = randomPaymentId;
  }
  if (sessionData.quote != null) {
    existingPayload.message.order.quote = sessionData.quote;
  }
  existingPayload.message.order.provider.id = sessionData.provider_id;

  if (existingPayload.message.order.items?.length > 0) {
    existingPayload.message.order.items =
      existingPayload.message.order.items.map((item: any) => {
        if (Array.isArray(item.tags)) {
          item.tags = updateItemInfoTags(item.tags);
        }
        return item;
      });
  }

  // UPDATE SETTLEMENT AMOUNT BASED ON QUOTE PRICE
  // if (existingPayload.message.order.tags) {
  //   existingPayload.message.order.tags = updateSettlementAmount(
  //     existingPayload.message.order.tags,
  //     sessionData.quote,
  //   );
  // }
  const initTags = (sessionData as any)?.init_tags?.flat();
  let settlementAmount = initTags
    ?.find((tag: any) => tag?.descriptor?.code === "BAP_TERMS")
    ?.list?.find((item: any) => item?.descriptor?.code === "SETTLEMENT_AMOUNT");

  existingPayload.message.order.tags = (
    (sessionData as any)?.on_search_tags?.flat() ?? []
  ).map((tag: any) => {
    if (tag?.descriptor?.code === "BPP_TERMS") {
      return {
        ...tag,
        list: [...(tag.list ?? []), settlementAmount],
      };
    }
    return tag;
  });

  return existingPayload;
}
