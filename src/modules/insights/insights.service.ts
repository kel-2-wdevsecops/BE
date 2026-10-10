import { cached } from '../../lib/cache';
import { buildInsights, type Insight } from '../../lib/insights';
import { CustomersService } from '../customers/customers.service';
import { GrowthService } from '../growth/growth.service';
import { OperationsService } from '../operations/operations.service';
import { OverviewService } from '../overview/overview.service';
import { ProductsService } from '../products/products.service';

// Agregat diambil dari loader (ber-cache) endpoint F01–F05 tanpa filter,
// supaya angka insight pasti sama dengan halaman detailnya.
async function load(): Promise<Insight[]> {
  const [overview, products, customers, growth, operations] = await Promise.all([
    OverviewService.get({}),
    ProductsService.get({ productLine: [] }),
    CustomersService.get({}),
    GrowthService.get({}),
    OperationsService.get({}),
  ]);

  const onHold = operations.statusBreakdown.find((s) => s.status === 'On Hold');
  return buildInsights({
    totalSales:    overview.kpi.sales,
    totalOrders:   overview.kpi.orders,
    productLines:  products.salesByProductLine,
    countries:     overview.topCountriesBySales,
    topCustomers:  customers.topCustomers,
    ordersByMonth: products.ordersByMonth,
    ytd:           growth.ytd,
    products:      products.products,
    prospects:     customers.kpi.prospects,
    onHold: {
      orders:   onHold?.orders ?? 0,
      sales:    onHold?.sales ?? 0,
      comments: operations.attentionOrders.filter((o) => o.status === 'On Hold').map((o) => o.comments),
    },
  });
}

export const InsightsService = {
  get: cached(load),
};
