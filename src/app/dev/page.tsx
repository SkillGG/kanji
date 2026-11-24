// "use client";

// import { Fragment, useState } from "react";
// import { useDebounce, useDebounceT } from "~/lib/hooks";
// import { api } from "~/trpc/react";
// import { Spinner } from "../_components/spinnerOn";
// import { containsKanji } from "~/lib/seed";
// import { cn } from "cn";

// export default function Page() {
//   const [_kl, setkl] = useState<string[]>([]);

//   const { value: kanjis } = useDebounceT(_kl, {
//     delay: 1000,
//     transform(v) {
//       return [...new Set(v.filter((q) => containsKanji(q)))];
//     },
//   });

//   const { data: jsho, isFetching } = api.db.getKanjiJishoData.useQuery(kanjis, {
//     enabled: kanjis.length > 0,
//     staleTime: Infinity,
//   });

//   const utils = api.useUtils();

//   return (
//     <>
//       <input
//         value={_kl.join("")}
//         className={cn(`h-full py-2`)}
//         onChange={(e) => {
//           setkl([...e.currentTarget.value]);
//         }}
//       />
//       <button
//         onClick={(e) => utils.invalidate()}
//         className={cn(
//           `cursor-pointer rounded-xl border border-black px-2 py-2`,
//           `hover:bg-black hover:text-white`,
//         )}
//       >
//         Reload
//       </button>{" "}
//       {kanjis.length > 0 && <span> =&gt; {kanjis.join(", ")}</span>}
//       <div>
//         {isFetching ? (
//           <Spinner spinnerStyle={{ className: "w-10 h-10" }} />
//         ) : (
//           <>
//             ({jsho?.length} / {kanjis.length})
//             <div
//               className={cn(
//                 `grid grid-cols-[min-content_1fr_1fr_0fr] gap-4 p-2`,
//               )}
//             >
//               {jsho?.map(({ kanji, kunyomi, meaning, onyomi, tags }) => (
//                 <Fragment key={kanji}>
//                   <div className={cn(`rounded-xl border px-2 py-2`)}>
//                     {kanji}
//                   </div>
//                   <div className={cn(`rounded-xl border px-2 py-2`)}>
//                     {kunyomi.join(" | ")} / {onyomi.join(" | ")}
//                   </div>
//                   <div className={cn(`rounded-xl border px-2 py-2`)}>
//                     {meaning.join(" | ")}
//                   </div>
//                   <div>{tags.map((n) => n.name).join(", ")}</div>
//                 </Fragment>
//               ))}
//             </div>
//           </>
//         )}
//       </div>
//     </>
//   );
// }
