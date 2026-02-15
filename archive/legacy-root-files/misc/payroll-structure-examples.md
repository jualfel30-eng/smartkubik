# Ejemplos de estructuras y reglas

## Estructura 1 · Operaciones junior (mensual)
- **Devengos**
  - Salario base (`fixed = 600`)
  - Bono desempeño (`percentage = 5%` sobre `E001`)
- **Deducciones**
  - ISLR (`percentage = 12%` sobre `E001`)
  - Aporte comedor (`fixed = 15`)
- **Notas**: si el bono requiere horas extra se añade `formula` con JSON Logic (`{"*": [{"var": "horasExtra"}, 2.5]}`) sumado a `baseSalary` a través de `context`.

## Estructura 2 · Ventas con comisiones (quincenal)
- **Devengos**
  - Salario base (`fixed = 450` quincenal)
  - Comisión (`formula` → `{"*": [{"var": "ventasPeriodo"}, 0.03]}`)
- **Deducciones**
  - IGTF (`percentage = 3%` sobre `concept:Comision`)
  - Retención judicial (`fixed = 25`)
- **Recomendación**: registrar `ventasPeriodo` desde `context` al simular o correr nómina (lo abastece el servicio que llama a `/payroll/runs`).

## Estructura 3 · Staff administrativo (mensual, con patronales)
- **Devengos**
  - Salario base (`fixed = 900`)
  - Bono alimentación (`fixed = 120`)
- **Deducciones**
  - Seguro social (`percentage = 4%`), base `E001`
  - Caja de ahorro (`percentage = 2%`)
- **Patronales**
  - Aporte empresa seguro social (`conceptType = employer`, `percentage = 9%` sobre `E001`)
  - Fondo de garantía (`fixed = 35`)
- **Balance**: la suma de devengos (1,020) – deducciones (~54) = neto (~966). Si se altera un porcentaje, correr simulador hasta que neto coincida.
