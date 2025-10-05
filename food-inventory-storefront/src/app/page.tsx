export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Food Inventory Storefront</h1>
        <p className="text-gray-600">Multi-tenant e-commerce platform</p>
        <p className="text-sm mt-4">Visit /{'{domain}'} to access a store</p>
      </div>
    </div>
  );
}
