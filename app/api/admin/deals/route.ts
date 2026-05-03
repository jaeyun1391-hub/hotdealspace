import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const COUPANG_HOST = "https://api-gateway.coupang.com";
const COUPANG_BASE_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1";
const REPOSITORY = "jaeyun1391-hub/hotdealspace";
const BRANCH = "main";

type ExtensionProduct = {
  productId?: string;
  productName?: string;
  productImage?: string;
  productUrl?: string;
  affiliateUrl?: string;
  salePrice?: number;
  originalPrice?: number;
  discountRate?: number;
  soldRate?: number;
  reviewCount?: number;
  deliveryText?: string;
};

type UpdatePayload = {
  source?: "goldbox" | "seller";
  products?: ExtensionProduct[];
};

function createAuthorization(method: string, pathWithQuery: string, accessKey: string, secretKey: string) {
  const signedDate = new Date().toISOString().slice(2, 19).replace(/[-:]/g, "") + "Z";
  const [requestPath, query = ""] = pathWithQuery.split("?");
  const message = `${signedDate}${method}${requestPath}${query}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

function normalizePrice(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function createStableProductId(product: ExtensionProduct) {
  const source = `${product.productName ?? ""}-${product.salePrice ?? ""}-${product.productImage ?? ""}`;
  return crypto.createHash("sha1").update(source).digest("hex").slice(0, 16);
}

function normalizeProducts(products: ExtensionProduct[]) {
  const seen = new Set<string>();

  return products
    .map((product) => ({
      productId: product.productId || createStableProductId(product),
      productName: product.productName?.trim(),
      productImage: product.productImage?.trim(),
      productUrl: product.productUrl?.trim(),
      affiliateUrl: product.affiliateUrl?.trim(),
      salePrice: normalizePrice(product.salePrice),
      originalPrice: normalizePrice(product.originalPrice),
      discountRate: normalizePrice(product.discountRate),
      soldRate: normalizePrice(product.soldRate),
      reviewCount: normalizePrice(product.reviewCount),
      deliveryText: product.deliveryText?.trim(),
    }))
    .filter((product) => {
      const key = `${product.productName}-${product.salePrice}`;

      if (!product.productName || !product.productImage || !product.productUrl || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

async function createAffiliateLinks(products: ReturnType<typeof normalizeProducts>) {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  if (!accessKey || !secretKey || products.length === 0) {
    return products;
  }

  const pathWithQuery = `${COUPANG_BASE_PATH}/deeplink`;
  const authorization = createAuthorization("POST", pathWithQuery, accessKey, secretKey);
  const linkedProducts = [];

  for (let index = 0; index < products.length; index += 10) {
    const chunk = products.slice(index, index + 10);
    const response = await fetch(`${COUPANG_HOST}${pathWithQuery}`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        coupangUrls: chunk.map((product) => product.productUrl),
        subId: process.env.COUPANG_SUB_ID,
      }),
    });

    if (!response.ok) {
      linkedProducts.push(...chunk);
      continue;
    }

    const result = await response.json();
    const links = Array.isArray(result.data) ? result.data : [];

    linkedProducts.push(
      ...chunk.map((product, chunkIndex) => ({
        ...product,
        affiliateUrl: links[chunkIndex]?.shortenUrl ?? links[chunkIndex]?.landingUrl ?? product.affiliateUrl ?? product.productUrl,
      })),
    );
  }

  return linkedProducts;
}

function getTargetFile(source: UpdatePayload["source"]) {
  if (source === "goldbox") {
    return {
      path: "data/goldbox-scrape.json",
      sourceUrl: "https://pages.coupang.com/p/121237?sourceType=gm_crm_goldbox&subSourceType=gm_crm_gwsrtcut",
      label: "Goldbox",
    };
  }

  return {
    path: "data/seller-special-scrape.json",
    sourceUrl: "https://www.coupang.com/np/omp",
    label: "Seller Special",
  };
}

async function updateGitHubFile({
  path,
  content,
  message,
}: {
  path: string;
  content: string;
  message: string;
}) {
  const token = process.env.GITHUB_DATA_TOKEN;

  if (!token) {
    throw new Error("GITHUB_DATA_TOKEN is missing");
  }

  const fileUrl = `https://api.github.com/repos/${REPOSITORY}/contents/${path}`;
  const currentResponse = await fetch(`${fileUrl}?ref=${BRANCH}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!currentResponse.ok) {
    throw new Error(`GitHub file lookup failed: ${currentResponse.status}`);
  }

  const currentFile = await currentResponse.json();
  const updateResponse = await fetch(fileUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha: currentFile.sha,
      branch: BRANCH,
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`GitHub file update failed: ${updateResponse.status} ${errorText}`);
  }

  return updateResponse.json();
}

export async function POST(request: Request) {
  try {
    const adminToken = process.env.ADMIN_UPDATE_TOKEN;
    const requestToken = request.headers.get("x-admin-token");

    if (!adminToken || requestToken !== adminToken) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UpdatePayload;
    const target = getTargetFile(body.source);
    const products = normalizeProducts(body.products ?? []);

    if (products.length === 0) {
      return NextResponse.json({ ok: false, message: "No valid products" }, { status: 400 });
    }

    const linkedProducts = await createAffiliateLinks(products);
    const payload = {
      source: target.sourceUrl,
      scrapedAt: new Date().toISOString(),
      count: linkedProducts.length,
      products: linkedProducts,
    };

    await updateGitHubFile({
      path: target.path,
      content: `${JSON.stringify(payload, null, 2)}\n`,
      message: `Update ${target.label} deal data from extension`,
    });

    return NextResponse.json({
      ok: true,
      source: body.source,
      count: linkedProducts.length,
      path: target.path,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
