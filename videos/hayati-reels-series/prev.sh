for v in bank where payday timetable budget kitchen zakat; do VARIANT=$v node render.js preview 0.1 1.6 3.2 5 >/dev/null; for t in 0.1 1.6 3.2 5; do mv prev_$t.jpg p_${v}_$t.jpg; done; done
