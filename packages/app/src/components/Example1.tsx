import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { ShoppingCart, Plus, CheckCircle } from "lucide-react";
import { useVoiceElement } from "chant-sdk";
import { ADD_TO_CART_ACTION_ID } from "@/lib/utils";

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 199.99,
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Smart Watch",
    description: "Fitness tracking smartwatch with heart rate monitor",
    price: 299.99,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Bluetooth Speaker",
    description: "Portable wireless speaker with premium sound quality",
    price: 89.99,
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Laptop Stand",
    description: "Adjustable aluminum laptop stand for better ergonomics",
    price: 49.99,
    image:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&h=300&fit=crop",
  },
  {
    id: 5,
    title: "Wireless Charger",
    description: "Fast wireless charging pad for smartphones and earbuds",
    price: 29.99,
    image:
      "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=300&fit=crop",
  },
  {
    id: 6,
    title: "USB-C Hub",
    description: "Multi-port USB-C hub with HDMI and USB 3.0 ports",
    price: 79.99,
    image:
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=300&h=300&fit=crop",
  },
];

export function Example1() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Register voice elements for each product's "Add to Cart" button
  const productButtonRefs = SAMPLE_PRODUCTS.map((product) =>
    useVoiceElement(ADD_TO_CART_ACTION_ID, {
      type: "button",
      label: `Add ${product.title} to Cart`,
      metadata: {
        productTitle: product.title,
        productDescription: product.description,
      },
      isVariable: true,
      variableDataAttribute: "data-product-id",
    })
  );

  const openCartButtonRef = useVoiceElement(ADD_TO_CART_ACTION_ID, {
    type: "button",
    label: "Cart button to open to cart details",
  });

  const checkoutButtonRef = useVoiceElement(ADD_TO_CART_ACTION_ID, {
    type: "button",
    label: "Checkout button to start the payment process",
  });

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsCheckingOut(false);
    setShowSuccess(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setCart([]);
    setShowSuccess(false);
    setIsCartOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Product Store</h1>
          <p className="text-lg text-muted-foreground">
            Browse our collection of tech products
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsCartOpen(true)}
          className="relative"
          ref={openCartButtonRef}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Cart
          {getTotalItems() > 0 && (
            <span className="absolute flex items-center justify-center w-5 h-5 text-xs rounded-full -top-2 -right-2 bg-primary text-primary-foreground">
              {getTotalItems()}
            </span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_PRODUCTS.map((product, index) => (
          <div
            key={product.id}
            className="overflow-hidden transition-shadow border rounded-lg bg-card hover:shadow-lg"
          >
            <img
              src={product.image}
              alt={product.title}
              className="object-cover w-full h-48"
            />
            <div className="p-4">
              <h3 className="mb-2 text-lg font-semibold">{product.title}</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {product.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">${product.price}</span>
                <Button
                  ref={productButtonRefs[index]}
                  data-product-id={product.id}
                  onClick={() => addToCart(product)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Shopping Cart ({getTotalItems()} items)</SheetTitle>
          </SheetHeader>

          <div className="flex-1 py-4 overflow-auto">
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-16 h-16 mb-4 text-green-500" />
                <h3 className="mb-2 text-xl font-semibold text-green-600">
                  Payment Successful!
                </h3>
                <p className="text-muted-foreground">
                  Your order has been processed successfully.
                </p>
              </div>
            ) : cart.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Your cart is empty
              </p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3 border rounded-lg"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="object-cover w-16 h-16 rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${item.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </Button>
                        <span className="px-2">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && !showSuccess && (
            <SheetFooter className="pt-4 border-t">
              <div className="w-full">
                <div className="flex justify-between mb-4 text-lg font-semibold">
                  <span>Total: ${getTotalPrice().toFixed(2)}</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  ref={checkoutButtonRef}
                >
                  {isCheckingOut ? "Processing..." : "Checkout"}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
