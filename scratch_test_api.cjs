
async function test() {
  const res = await fetch('http://localhost:3001/api/filter-values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connectionId: 'conn-1777326852572',
      fieldName: 'Agencia_Responsable_Intereses',
      baseQuery: 'SELECT TOP 500 * FROM [dbo].[DAS_DIARIO]'
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
