import { ReceiveForm } from "@/components/ReceiveForm";
import { normalizeCode } from "@/lib/code";

type SearchParamsRaw = { [key: string]: string | string[] | undefined };

export default async function ReceivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRaw>;
}) {
  const params = await searchParams;
  const cParam = params.c;
  const initialCode = normalizeCode(
    Array.isArray(cParam) ? cParam[0] ?? "" : cParam ?? ""
  );
  const errorParam = params.error;
  const initialError =
    (Array.isArray(errorParam) ? errorParam[0] : errorParam) || undefined;

  return (
    <div className="max-w-md mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16">
      <section className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-deep font-medium mb-4">
          Step two · on your ereader
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-ink leading-[1.05]">
          Receive a book
        </h1>
        <p className="mt-4 text-base text-ink-muted">
          Type the four-character code shown on the device that uploaded the
          book.
        </p>
      </section>

      <ReceiveForm initialCode={initialCode} initialError={initialError} />
    </div>
  );
}
