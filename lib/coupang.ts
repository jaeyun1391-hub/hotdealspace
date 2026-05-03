import crypto from "crypto";

export type CoupangProduct = {
  productId: number | string;
  productName: string;
  productPrice?: number;
  originalPrice?: number;
  discountRate?: number;
  soldRate?: number;
  reviewCount?: number;
  deliveryText?: string;
  timeRemaining?: string;
  dealScore?: number;
  dealLabels?: string[];
  productImage: string;
  productUrl: string;
  categoryName?: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
};

const COUPANG_HOST = "https://api-gateway.coupang.com";
const COUPANG_BASE_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1";

const categoryAliases: Record<string, string[]> = {
  "1010": ["뷰티", "화장", "로션", "크림", "샴푸", "에센스"],
  "1011": ["출산", "유아", "아기", "베이비", "키즈"],
  "1012": ["식품", "로켓프레시", "과일", "쌀", "생수", "간식", "커피"],
  "1013": ["주방", "키친", "식기", "냄비", "프라이팬", "조리", "수저"],
  "1014": ["생활", "세제", "휴지", "물티슈", "청소", "욕실", "세탁"],
  "1015": ["홈", "인테리어", "가구", "침구", "커튼", "수납"],
  "1016": ["가전", "디지털", "케이블", "충전", "이어폰", "모니터"],
  "1017": ["스포츠", "레저", "캠핑", "운동", "등산", "헬스"],
  "1018": ["자동차", "차량", "차박", "타이어", "방향제"],
  "1019": ["도서", "음반", "DVD", "책", "앨범"],
  "1020": ["완구", "취미", "장난감", "보드게임", "퍼즐"],
  "1021": ["문구", "오피스", "노트", "펜", "파일", "사무"],
  "1024": ["헬스", "건강", "비타민", "영양제", "프로틴"],
};

const hotDealSignals = [
  { keyword: "초특가", label: "초특가", score: 30 },
  { keyword: "특가", label: "특가", score: 24 },
  { keyword: "타임", label: "타임딜", score: 22 },
  { keyword: "한정", label: "한정", score: 18 },
  { keyword: "역대", label: "역대가", score: 26 },
  { keyword: "할인", label: "할인", score: 18 },
  { keyword: "1+1", label: "1+1", score: 20 },
  { keyword: "증정", label: "증정", score: 12 },
  { keyword: "쿠폰", label: "쿠폰", score: 12 },
  { keyword: "골드박스", label: "골드박스", score: 24 },
  { keyword: "Gold box", label: "골드박스", score: 24 },
];

type CoupangApiProduct = {
  productId?: number | string;
  productName?: string;
  productPrice?: number;
  originalPrice?: number;
  basePrice?: number;
  salePrice?: number;
  discountPrice?: number;
  discountRate?: number;
  discountPercentage?: number;
  productImage?: string;
  productUrl?: string;
  categoryName?: string;
  keyword?: string;
  rank?: number;
  isRocket?: boolean;
  isFreeShipping?: boolean;
};

export const sampleProducts: CoupangProduct[] = [
  {
    productId: "sample-1",
    productName: "오늘만 특가 산지직송 사과 3kg",
    productPrice: 15900,
    productImage: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "식품",
    isRocket: true,
    isFreeShipping: true,
  },
  {
    productId: "sample-2",
    productName: "매일 쓰는 대용량 주방 세제 리필 세트",
    productPrice: 11900,
    productImage: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "생활용품",
    isRocket: true,
  },
  {
    productId: "sample-3",
    productName: "촉촉한 보습 핸드크림 3개입 기획세트",
    productPrice: 9900,
    productImage: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "뷰티",
    isFreeShipping: true,
  },
  {
    productId: "sample-4",
    productName: "가벼운 무선 미니 청소기 차량 겸용",
    productPrice: 29900,
    productImage: "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "가전디지털",
    isRocket: true,
  },
  {
    productId: "sample-5",
    productName: "깔끔한 데스크 정리함 문구 오거나이저",
    productPrice: 7900,
    productImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "문구/오피스",
    isFreeShipping: true,
  },
  {
    productId: "sample-6",
    productName: "홈트레이닝 논슬립 요가매트",
    productPrice: 13900,
    productImage: "https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=600&q=80",
    productUrl: "https://www.coupang.com/",
    categoryName: "스포츠/레저",
    isRocket: true,
    isFreeShipping: true,
  },
];

function getCredentials() {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  if (!accessKey || !secretKey) {
    return null;
  }

  return { accessKey, secretKey };
}

function createAuthorization(method: string, pathWithQuery: string, accessKey: string, secretKey: string) {
  const now = new Date();
  const signedDate =
    now
      .toISOString()
      .slice(2, 19)
      .replace(/[-:]/g, "") + "Z";
  const [path, query = ""] = pathWithQuery.split("?");
  const message = `${signedDate}${method}${path}${query}`;
  const signature = crypto.createHmac("sha256", secretKey).update(message).digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

function toPositiveNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function getProductPrice(product: CoupangApiProduct) {
  return toPositiveNumber(product.productPrice) ?? toPositiveNumber(product.salePrice) ?? toPositiveNumber(product.discountPrice);
}

function getOriginalPrice(product: CoupangApiProduct, productPrice?: number) {
  const originalPrice = toPositiveNumber(product.originalPrice) ?? toPositiveNumber(product.basePrice);

  if (!originalPrice || !productPrice || originalPrice <= productPrice) {
    return undefined;
  }

  return originalPrice;
}

function getDiscountRate(product: CoupangApiProduct, originalPrice?: number, productPrice?: number) {
  const apiDiscountRate = toPositiveNumber(product.discountRate) ?? toPositiveNumber(product.discountPercentage);

  if (apiDiscountRate) {
    return Math.round(apiDiscountRate);
  }

  if (!originalPrice || !productPrice || originalPrice <= productPrice) {
    return undefined;
  }

  return Math.round(((originalPrice - productPrice) / originalPrice) * 100);
}

function getDealSignals(product: CoupangApiProduct, productPrice?: number) {
  const target = `${product.keyword ?? ""} ${product.categoryName ?? ""} ${product.productName ?? ""}`;
  const labels = new Set<string>();
  let score = 0;

  hotDealSignals.forEach((signal) => {
    if (target.includes(signal.keyword)) {
      labels.add(signal.label);
      score += signal.score;
    }
  });

  if (productPrice && productPrice <= 5000) {
    labels.add("5천원대");
    score += 16;
  } else if (productPrice && productPrice <= 10000) {
    labels.add("만원이하");
    score += 12;
  }

  if (product.isRocket) {
    score += 5;
  }

  if (product.isFreeShipping) {
    score += 4;
  }

  if (product.rank && product.rank > 0) {
    score += Math.max(0, 12 - Math.floor(product.rank / 10));
  }

  return {
    dealScore: score,
    dealLabels: Array.from(labels).slice(0, 2),
  };
}

function normalizeProducts(products: CoupangApiProduct[] = []): CoupangProduct[] {
  return products
    .filter((product) => product.productName && product.productImage && product.productUrl)
    .map((product, index) => ({
      productId: product.productId ?? `${product.productName}-${index}`,
      productName: product.productName ?? "쿠팡 추천 상품",
      productPrice: getProductPrice(product),
      originalPrice: getOriginalPrice(product, getProductPrice(product)),
      discountRate: getDiscountRate(product, getOriginalPrice(product, getProductPrice(product)), getProductPrice(product)),
      ...getDealSignals(product, getProductPrice(product)),
      productImage: product.productImage ?? "",
      productUrl: product.productUrl ?? "https://www.coupang.com/",
      categoryName: product.categoryName,
      isRocket: product.isRocket,
      isFreeShipping: product.isFreeShipping,
    }));
}

function prioritizeCategoryProducts(products: CoupangProduct[], categoryId: string) {
  const aliases = categoryAliases[categoryId];

  if (!aliases || products.length === 0) {
    return products;
  }

  const matches = products.filter((product) => {
    const target = `${product.categoryName ?? ""} ${product.productName}`;
    return aliases.some((alias) => target.includes(alias));
  });
  const rest = products.filter((product) => !matches.includes(product));

  return [...matches, ...rest];
}

function prioritizeHotDealProducts(products: CoupangProduct[]) {
  return products
    .map((product, index) => ({ product, index }))
    .sort((left, right) => {
      const scoreGap = (right.product.dealScore ?? 0) - (left.product.dealScore ?? 0);

      if (scoreGap !== 0) {
        return scoreGap;
      }

      const leftPrice = left.product.productPrice ?? Number.MAX_SAFE_INTEGER;
      const rightPrice = right.product.productPrice ?? Number.MAX_SAFE_INTEGER;
      const priceGap = leftPrice - rightPrice;

      return priceGap !== 0 ? priceGap : left.index - right.index;
    })
    .map(({ product }) => product);
}

export async function fetchCoupangProducts({
  view,
  categoryId,
  keyword,
  limit,
}: {
  view: string;
  categoryId: string;
  keyword: string;
  limit: number;
}) {
  const credentials = getCredentials();

  if (!credentials) {
    return {
      products: sampleProducts,
      source: "sample" as const,
      message: "COUPANG_ACCESS_KEY와 COUPANG_SECRET_KEY를 넣으면 실제 쿠팡 상품으로 바뀝니다.",
    };
  }

  const isSearch = view === "search" && keyword;
  const safeLimit = isSearch ? Math.min(limit, 10) : limit;
  const params = new URLSearchParams({
    limit: String(safeLimit),
    imageSize: "512x512",
  });

  if (process.env.COUPANG_SUB_ID) {
    params.set("subId", process.env.COUPANG_SUB_ID);
  }

  let path = `${COUPANG_BASE_PATH}/products/goldbox`;

  if (isSearch) {
    params.set("keyword", keyword);
    params.set("srpLinkOnly", "false");
    path = `${COUPANG_BASE_PATH}/products/search`;
  }

  if (view === "category" && categoryId && categoryId !== "goldbox") {
    path = `${COUPANG_BASE_PATH}/products/bestcategories/${categoryId}`;
  }

  const pathWithQuery = `${path}?${params.toString()}`;
  const authorization = createAuthorization("GET", pathWithQuery, credentials.accessKey, credentials.secretKey);
  const response = await fetch(`${COUPANG_HOST}${pathWithQuery}`, {
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Coupang API error: ${response.status}`);
  }

  const result = await response.json();
  const rawProducts = Array.isArray(result.data) ? result.data : result.data?.productData;
  const products = normalizeProducts(rawProducts);

  return {
    products: prioritizeHotDealProducts(isSearch ? products : prioritizeCategoryProducts(products, categoryId)),
    source: "coupang" as const,
    message: "",
  };
}
