import { cn } from "cn";
import { Fragment, type DetailedHTMLProps, type HTMLAttributes } from "react";
import { containsKanji } from "~/lib/seed";

type ReadingData = { part: string; ruby: string }[];

export const parseReadingData = (
  word: string,
  reading: string,
): ReadingData => {
  const parts = reading.split(".");

  if (parts.length !== word.length) {
    const p: { part: string; ruby: string }[] = parts.map((p, i, a) =>
      i === a.length - 1
        ? { part: "", ruby: "" }
        : {
            part: word[i] || "",
            ruby: p,
          },
    );

    return [
      ...p.filter((p) => p.part),
      {
        part: word.substring(p.length - 1),
        ruby: reading
          .replaceAll(".", "")
          .substring(p.reduce((p, n) => p + n.ruby.length, 0)),
      },
    ];
  }

  return parts.map((q, i) => {
    return { part: word[i] || "", ruby: q };
  });
};

export const JapaneseRuby = ({
  text,
  reading,
  ruby,
  ...rest
}: {
  text: string;
  reading: string;
  ruby?: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>) => {
  const spReading = parseReadingData(text, reading);
  // console.log(spReading);

  const newKey = typeof rest.key === "string" ? `${rest.key}_` : text;
  return (
    <span {...rest} data-jpruby="true">
      {spReading.map(({ part, ruby: r }, i) => (
        <ruby {...ruby} key={`${newKey}(${part}#${i})`}>
          {part}
          {r ? (
            <Fragment key={`${newKey}(${part}#${i})_wr`}>
              <rp>(</rp>
              <rt
                className={cn(
                  `mb-1 text-xs text-slate-400`,
                  // `rounded-t-md border-t-3 border-white/50`,
                )}
              >
                {r}
              </rt>
              <rp>)</rp>
            </Fragment>
          ) : (
            <Fragment key={`${newKey}(${part}#${i})_nr`}>
              <rp>(</rp>
              <rt className={cn(`text-xs text-slate-400`)}></rt>
              <rp>)</rp>
            </Fragment>
          )}
        </ruby>
      ))}
    </span>
  );
};
