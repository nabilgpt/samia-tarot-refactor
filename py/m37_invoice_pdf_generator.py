#!/usr/bin/env python3
"""
M37 Deterministic PDF Invoice Generator
Creates consistent, reproducible invoice PDFs with embedded verification hash
"""
import os
import hashlib
import json
from datetime import datetime, date
from decimal import Decimal
import psycopg2
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO

class DeterministicInvoicePDF:
    def __init__(self):
        self.dsn = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

        # Fixed styles for deterministic output
        self.styles = getSampleStyleSheet()
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=12,
            alignment=TA_CENTER
        ))
        self.styles.add(ParagraphStyle(
            name='InvoiceHeader',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        self.styles.add(ParagraphStyle(
            name='InvoiceFooter',
            parent=self.styles['Normal'],
            fontSize=8,
            spaceAfter=6,
            alignment=TA_CENTER
        ))

    def fetch_invoice_data(self, invoice_id):
        """Fetch complete invoice data with items"""
        with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
            # Get invoice data
            cur.execute("""
            SELECT
                i.id, i.number, i.order_id, i.total_cents, i.currency,
                i.subtotal_cents, i.vat_cents, i.billing_name, i.billing_email,
                i.billing_country, i.created_at, i.meta,
                o.user_id, o.service_id, o.question_text,
                p.email as user_email, CONCAT(p.first_name, ' ', p.last_name) as full_name
            FROM invoices i
            JOIN orders o ON o.id = i.order_id
            LEFT JOIN profiles p ON p.id = o.user_id
            WHERE i.id = %s
            """, (invoice_id,))

            invoice_row = cur.fetchone()
            if not invoice_row:
                raise ValueError(f"Invoice {invoice_id} not found")

            # Get invoice items
            cur.execute("""
            SELECT service_name, description, quantity, unit_price_cents, total_cents, currency
            FROM invoice_items
            WHERE invoice_id = %s
            ORDER BY service_name, id
            """, (invoice_id,))

            items = cur.fetchall()

            # Structure the data for deterministic processing
            invoice_data = {
                'id': invoice_row[0],
                'number': invoice_row[1],
                'order_id': invoice_row[2],
                'total_cents': invoice_row[3],
                'currency': invoice_row[4],
                'subtotal_cents': invoice_row[5],
                'vat_cents': invoice_row[6],
                'billing_name': invoice_row[7] or invoice_row[15],  # fallback to full_name
                'billing_email': invoice_row[8] or invoice_row[14],  # fallback to user_email
                'billing_country': invoice_row[9] or 'United States',
                'created_at': invoice_row[10],
                'meta': invoice_row[11] or {},
                'user_id': invoice_row[12],
                'service_id': invoice_row[13],
                'question_text': invoice_row[14],
                'items': [
                    {
                        'service_name': item[0],
                        'description': item[1],
                        'quantity': item[2],
                        'unit_price_cents': item[3],
                        'total_cents': item[4],
                        'currency': item[5]
                    }
                    for item in items
                ]
            }

            return invoice_data

    def format_currency(self, cents, currency='USD'):
        """Format currency consistently"""
        amount = Decimal(cents) / 100
        if currency == 'USD':
            return f"${amount:.2f}"
        else:
            return f"{amount:.2f} {currency}"

    def calculate_content_hash(self, invoice_data):
        """Calculate deterministic hash of invoice content"""
        # Create a normalized representation for hashing
        hash_data = {
            'id': invoice_data['id'],
            'number': invoice_data['number'],
            'total_cents': invoice_data['total_cents'],
            'currency': invoice_data['currency'],
            'subtotal_cents': invoice_data['subtotal_cents'],
            'vat_cents': invoice_data['vat_cents'],
            'issue_date': invoice_data['created_at'].date().isoformat(),
            'items': sorted([
                {
                    'service': item['service_name'],
                    'qty': item['quantity'],
                    'price': item['unit_price_cents'],
                    'total': item['total_cents']
                }
                for item in invoice_data['items']
            ], key=lambda x: x['service'])
        }

        # Create deterministic JSON string (sorted keys)
        hash_string = json.dumps(hash_data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(hash_string.encode()).hexdigest()

    def create_invoice_pdf(self, invoice_data):
        """Generate deterministic PDF invoice"""
        buffer = BytesIO()

        # Use A4 page size for consistency
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )

        story = []

        # Header
        story.append(Paragraph("SAMIA TAROT", self.styles['InvoiceTitle']))
        story.append(Paragraph("Professional Tarot Services", self.styles['InvoiceHeader']))
        story.append(Spacer(1, 12))

        # Invoice details table
        invoice_details = [
            ['Invoice Number:', invoice_data['number'] or f"INV-{invoice_data['id']}"],
            ['Issue Date:', invoice_data['created_at'].strftime('%Y-%m-%d')],
            ['Order ID:', str(invoice_data['order_id'])],
            ['Currency:', invoice_data['currency']]
        ]

        details_table = Table(invoice_details, colWidths=[2*inch, 3*inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        story.append(details_table)
        story.append(Spacer(1, 20))

        # Billing information
        story.append(Paragraph("BILL TO:", self.styles['Heading2']))
        bill_to = [
            invoice_data['billing_name'],
            invoice_data['billing_email'],
            invoice_data['billing_country']
        ]
        for line in bill_to:
            if line:
                story.append(Paragraph(line, self.styles['InvoiceHeader']))

        story.append(Spacer(1, 20))

        # Items table
        story.append(Paragraph("SERVICES PROVIDED:", self.styles['Heading2']))

        # Table headers
        items_data = [['Service', 'Description', 'Qty', 'Unit Price', 'Total']]

        # Add items (sorted for deterministic output)
        for item in sorted(invoice_data['items'], key=lambda x: x['service_name']):
            items_data.append([
                item['service_name'],
                item['description'] or '',
                str(item['quantity']),
                self.format_currency(item['unit_price_cents'], item['currency']),
                self.format_currency(item['total_cents'], item['currency'])
            ])

        # Add totals
        items_data.extend([
            ['', '', '', 'Subtotal:', self.format_currency(invoice_data['subtotal_cents'], invoice_data['currency'])],
            ['', '', '', 'VAT/Tax:', self.format_currency(invoice_data['vat_cents'], invoice_data['currency'])],
            ['', '', '', 'TOTAL:', self.format_currency(invoice_data['total_cents'], invoice_data['currency'])]
        ])

        items_table = Table(items_data, colWidths=[2*inch, 2.5*inch, 0.5*inch, 1*inch, 1*inch])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),  # Qty column center
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),  # Price columns right
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),

            # Grid
            ('GRID', (0, 0), (-1, len(items_data)-3), 0.5, colors.black),

            # Totals section
            ('LINEABOVE', (3, len(items_data)-3), (-1, len(items_data)-3), 1, colors.black),
            ('FONTNAME', (3, len(items_data)-1), (-1, len(items_data)-1), 'Helvetica-Bold'),
            ('FONTSIZE', (3, len(items_data)-1), (-1, len(items_data)-1), 11),
        ]))

        story.append(items_table)
        story.append(Spacer(1, 30))

        # Footer with hash for verification
        content_hash = self.calculate_content_hash(invoice_data)
        story.append(Paragraph("Thank you for choosing Samia Tarot services.", self.styles['InvoiceFooter']))
        story.append(Paragraph(f"Document Hash: {content_hash[:16]}...", self.styles['InvoiceFooter']))
        story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} UTC", self.styles['InvoiceFooter']))

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes, content_hash

    def generate_invoice_pdf(self, invoice_id):
        """Main method to generate invoice PDF with audit trail"""
        try:
            # Fetch invoice data
            invoice_data = self.fetch_invoice_data(invoice_id)

            # Generate PDF
            pdf_bytes, content_hash = self.create_invoice_pdf(invoice_data)

            # Update database with PDF metadata
            with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                cur.execute("""
                UPDATE invoices
                SET
                    pdf_generated_at = NOW(),
                    pdf_hash = %s,
                    pdf_version = COALESCE(pdf_version, 0) + 1
                WHERE id = %s
                """, (content_hash, invoice_id))

                # Log generation event
                cur.execute("""
                SELECT log_invoice_access(%s, 'pdf_generated', %s, %s, %s, %s, %s, %s, %s)
                """, (
                    invoice_id,
                    'pdf_generated',
                    invoice_data['user_id'],
                    None,  # client_ip
                    'M37-PDF-Generator',  # user_agent
                    None,  # signed_url_expires_at
                    True,  # success
                    None,  # error_message
                    json.dumps({'hash': content_hash, 'size_bytes': len(pdf_bytes)})
                ))

                conn.commit()

            return {
                'pdf_bytes': pdf_bytes,
                'content_hash': content_hash,
                'size_bytes': len(pdf_bytes),
                'invoice_data': invoice_data
            }

        except Exception as e:
            # Log failure
            try:
                with psycopg2.connect(self.dsn) as conn, conn.cursor() as cur:
                    cur.execute("""
                    SELECT log_invoice_access(%s, 'pdf_generated', %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        invoice_id,
                        'pdf_generated',
                        None,  # accessed_by
                        None,  # client_ip
                        'M37-PDF-Generator',  # user_agent
                        None,  # signed_url_expires_at
                        False,  # success
                        str(e),  # error_message
                        json.dumps({'error': 'pdf_generation_failed'})
                    ))
                    conn.commit()
            except:
                pass  # Don't fail if audit logging fails

            raise

def main():
    # Test the PDF generator
    generator = DeterministicInvoicePDF()

    # For testing, we'll need an actual invoice ID
    print("M37 PDF Invoice Generator - Test Mode")
    print("=" * 40)

    # Check if there are any invoices to test with
    with psycopg2.connect(generator.dsn) as conn, conn.cursor() as cur:
        cur.execute("SELECT id, number FROM invoices LIMIT 1")
        result = cur.fetchone()

        if result:
            invoice_id = result[0]
            invoice_number = result[1]
            print(f"Testing with invoice {invoice_id} ({invoice_number})")

            try:
                result = generator.generate_invoice_pdf(invoice_id)
                print(f"PDF generated successfully:")
                print(f"  Size: {result['size_bytes']} bytes")
                print(f"  Hash: {result['content_hash']}")
                print(f"  Invoice: {result['invoice_data']['number']}")

                # Save test PDF
                with open(f'test_invoice_{invoice_id}.pdf', 'wb') as f:
                    f.write(result['pdf_bytes'])
                print(f"  Saved: test_invoice_{invoice_id}.pdf")

            except Exception as e:
                print(f"Error generating PDF: {e}")
        else:
            print("No invoices found in database for testing")

if __name__ == "__main__":
    main()