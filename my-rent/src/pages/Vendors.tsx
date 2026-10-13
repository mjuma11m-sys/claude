import { useStore } from "../data/store";
import { DemoNote } from "../ui/kit";
import { Icon } from "../ui/icons";

const digits = (phone: string) => phone.replace(/\D/g, "");

/** الموردين: اتصال أو واتساب بضغطة. الرقم لازم يكون 8 أرقام بحرينية كاملة */
export function Vendors() {
  const { data } = useStore();
  return (
    <div className="stack-lg">
      <ul className="rows card-list">
        {data.vendors.map((v) => {
          const ok = digits(v.phone).length === 8;
          return (
            <li key={v.id}>
              <span><span className="strong">{v.name}</span><br /><span className="muted small">{v.service} · <span className="num">{v.phone}</span></span></span>
              <span className="row-actions">
                {ok ? (
                  <>
                    <a className="icon-btn press" href={`tel:+973${digits(v.phone)}`} aria-label={`اتصال ${v.name}`}>{Icon.phone}</a>
                    <a className="icon-btn press wa" href={`https://wa.me/973${digits(v.phone)}`} target="_blank" rel="noreferrer" aria-label={`واتساب ${v.name}`}>WA</a>
                  </>
                ) : <span className="muted small">رقم تجريبي</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <DemoNote />
    </div>
  );
}
