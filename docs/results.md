# Benchmark results

18 single-fault cases on the BB-100 bench, six-probe budget. `Rank` is the
position of the true suspect in the agent's ranked list. `Solver` is the
physics cross-check after probe selection.

| Case | Fault | Agent ranked | True | Rank | Solver |
| --- | --- | --- | --- | --- | --- |
| F01 | Blown input fuse | F1 | F1 | 1 | F01 |
| F02 | Open reverse-polarity diode | D1 > C1 | D1 | 1 | F02 |
| F03 | Reverse-polarity diode installed backwards | D1 > C1 | D1 | 1 | F03 |
| F04 | 5V regulator dead | U1 > C2 > TR5 | U1 | 1 | F04 |
| F05 | 5V regulator pass transistor shorted | U1 > C2 | U1 | 1 | F05 |
| F06 | Shorted 5V decoupling capacitor | C2 > U2 > U3 | C2 | 1 | F06 |
| F07 | Open 5V trace | TR5 > U2 | TR5 | 1 | F07 |
| F08 | 3.3V regulator dead | U2 > C3 > R3 | U2 | 1 | F08 |
| F09 | Shorted 3.3V decoupling capacitor | U2 > C3 > D3 | C3 | 2 | F09 |
| F10 | MCU VCC shorted to ground | C2 > U1 > U2 | U3 | miss | F10 |
| F11 | Open power-LED resistor | R2 > D2 | R2 | 1 | F11 |
| F12 | Wrong power-LED resistor | R2 > D2 | R2 | 1 | F12 |
| F13 | Reset button stuck closed | SW1 > R1 > U3 | SW1 | 1 | F13 |
| F14 | Open power LED | D2 > R2 | D2 | 1 | F14 |
| F15 | Open 3.3V LED resistor | R3 > D3 | R3 | 1 | F15 |
| F16 | Open 3.3V LED | D3 > R3 | D3 | 1 | F16 |
| F17 | Shorted input capacitor | C1 > U1 | C1 | 1 | F17 |
| F18 | 5V regulator output low | U1 > C2 > TR5 | U1 | 1 | F18 |

**Agent top-1:** 16/18  
**Agent top-3:** 17/18  
**Solver top-1 (by suspect):** 18/18

F02 and F03 are the closest pair: an open diode and a diode installed
backwards. Both block forward current and both point at D1. The bench solver
separates them from the resistance reading; on a real board the part marking
is the reliable signal.

F15 originally exposed a tie: with only the 5V and 3V3 voltages probed, a
stuck reset button fits the evidence as well as an open 3V3 LED resistor. The
solver now breaks ties with the model's ranking.
