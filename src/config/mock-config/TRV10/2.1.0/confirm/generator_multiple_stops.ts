import { SessionData } from "../../session-types";

const customer = {
  contact: {
    phone: "9876556789",
  },
  person: {
    name: "Joe Adams",
  },
};

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

export async function confirmMultipleStopsGenerator(
  existingPayload: any,
  sessionData: SessionData,
) {
  existingPayload.message.order.fulfillments =
    sessionData.selected_fulfillments;
  // existingPayload.message.order.fulfillments[0]["customer"] = customer;
  existingPayload.message.order.items[0] = {
    id: sessionData.selected_item_id,
  };

  const flattenedItems = sessionData.selected_items.flat();
  if (flattenedItems && flattenedItems.length > 0) {
    existingPayload.message.order.items = flattenedItems;
  }
  existingPayload.message.order.fulfillments.forEach((fulfillment: any) => {
    delete fulfillment.tags;
  });
  existingPayload.message.order.payments = sessionData.payments;
  existingPayload.message.order.provider.id = sessionData.provider_id;

  // UPDATE SETTLEMENT AMOUNT BASED ON QUOTE PRICE
  // if (existingPayload.message.order.tags) {
  //   existingPayload.message.order.tags = updateSettlementAmount(
  //     existingPayload.message.order.tags,
  //     sessionData.quote
  //   );
  // }
  existingPayload.message.order.tags = [
    ...(sessionData as any)?.init_tags?.flat(),
    ...(sessionData as any)?.on_init_tags?.flat(),
  ];
  return existingPayload;
}
