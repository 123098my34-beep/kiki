import axios from 'axios';

export class KlaviyoActionService {
  /**
   * Pushes a dynamically computed smart segment (e.g. Churn Risk or VIP Winback)
   * directly back into the client's Klaviyo account for instant campaign deployment.
   */
  static async pushSmartSegment(
    apiKey: string,
    segmentName: string,
    customerProfileIds: string[]
  ): Promise<{ listId: string; membersAdded: number }> {
    const client = axios.create({
      baseURL: 'https://a.klaviyo.com/api',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-07-15',
        'Content-Type': 'application/json'
      }
    });

    // 1. Create a dedicated list for this action cohort
    const createListRes = await client.post('/lists', {
      data: {
        type: 'list',
        attributes: {
          name: `[Pulse AI Action] ${segmentName} - ${new Date().toISOString().split('T')[0]}`
        }
      }
    });

    const listId = createListRes.data.data.id;

    // 2. Batch subscribe / add profiles to list
    const batchData = customerProfileIds.slice(0, 1000).map(id => ({
      type: 'profile',
      id
    }));

    if (batchData.length > 0) {
      await client.post(`/lists/${listId}/relationships/profiles`, {
        data: batchData
      });
    }

    return {
      listId,
      membersAdded: batchData.length
    };
  }
}
